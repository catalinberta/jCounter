/**********************************
* jCounter Script v0.1.1 (beta)
* Author: Catalin Berta
* Official page and documentation: http://devingredients.com/jcounter
* Licensed under the MIT license: http://opensource.org/licenses/MIT
**********************************/
;(function($,document,window,undefined) {
	//once upon a time...
	$.fn.jCounter = function(options,callback) {
		var consoleLog = false;	//shows debug messages via console.log() if true
		var customRangeDownCount; //if true, it will tell countdown_proc() it's a down count and not an up count.
		var endCounter = false; //stops jCounter if true
		var eventDate; //time target (holds a number of seconds)
		var pausedTime; //stores the time (in seconds) when pausing
		var thisEl = this; //custom 'this' selector
		var thisLength = this.length; //number of multiple elements per selector
		var singularLabels = new Array('DAY','HOUR','MINUTE','SECOND');	//singular labels - use for localization
		var pluralLabels = new Array('DAYS','HOURS','MINUTES','SECONDS'); //plural labels - use for localization
		var remoteDateURL = "http://www.devingredients.com/files/dateandtime.php"; //URL to external dateandtime.php file
		var localDateURL = "dateandtime.php"; //path to local dateandtime.php file
		this.options = options; //stores jCounter's options parameter to verify against specified methods

		//default settings
		var settings = {
			customDuration: null,
			customRange: null,
			date: null,
			dateSource: 'remote',
			fallback: null,
			format: 'dd:hh:mm:ss',
			timezone: 'Europe/London',
			twoDigits: 'on'
		};

		//merge the settings with the options values
		if (typeof options === 'object') {
			$.extend(settings,options);
			thisEl.data("userOptions", settings); //push the settings to applied elements (they're used by methods)
		}
		//METHODS
		var jC_methods = {
			//initialize
			init : function() {
				thisEl.each(function(i,el) {
					startCounter(el);
				});
			},
			//pause method: $.jCounter('pause')
			pause : function() {
				if(consoleLog) { console.log("(jC) Activity: Counter paused."); }
				endCounter = true;
				return thisEl.each(function(i,el) {
					clearInterval($(el).data("jC_interval"));
				});
			},
			//stop method: $.jCounter('stop')
			stop : function() {
				if(consoleLog) { console.log("(jC) Activity: Counter stopped."); }
				endCounter = true;
				return thisEl.each(function(i,el) {
					clearInterval($(el).data("jC_interval"));
					$(el).removeData("jC_pausedTime");
					resetHTMLCounter(el);
				});
			},
			//reset method: $.jCounter('reset')
			reset : function() {
				if(consoleLog) { console.log("(jC) Activity: Counter reset."); }
				return thisEl.each(function(i,el) {
					clearInterval($(el).data("jC_interval"));
					resetHTMLCounter(el);
					startCounter(el);
				});
			},
			//start method: $.jCounter('start')
			start : function() {
				return thisEl.each(function(i,el) {
					pausedTime = $(el).data("jC_pausedTime");
					endCounter = false;
					clearInterval($(el).data("jC_interval"));
					startCounter(el);
				});
			}
		}
		
		//checks whether this jCounter instance runs by a customDuration setting
		if(thisEl.data("userOptions").customDuration) {
			if(!isNaN(thisEl.data("userOptions").customDuration)) {
				var customDuration = true;
			} else {
				var customDuration = false;
				if(consoleLog) { console.log("(jC) Error: The customDuration value is not a number! NOTE: 'customDuration' accepts a number of seconds."); }
			}
		}
		
		//checks whether this jCounter instance runs by a customRange setting
		if(thisEl.data("userOptions").customRange) {	
			var customRangeValues = thisEl.data("userOptions").customRange.split(":");
			var rangeVal0 = parseInt(customRangeValues[0]);
			var rangeVal1 = parseInt(customRangeValues[1]);
			if(!isNaN(rangeVal0) && !isNaN(rangeVal1)) {
				var customRange = true;
				if(rangeVal0 > rangeVal1) {
					var customRangeDownCount = true;
				} else {
					var customRangeDownCount = false;
				}
			} else {
				var customRange = false;
				if(consoleLog) { console.log("(jC) Error: The customRange value is not a valid range! Example: customRange: '0:30' or '30:0'"); }
			}
		}

		//FUNCTIONS
		
		//jCounter initializer
		function startCounter(el) {
			if(customDuration) {
				if (pausedTime) {
					if (!isNaN(pausedTime)) {
						eventDate = Math.round(pausedTime);
					}
				} else {
					eventDate = Math.round($(el).data("userOptions").customDuration);
				}
				currentTime = 0;
				countdown_proc(currentTime,el);
				$(el).data("jC_interval", setInterval(function(){
					if(endCounter == false) {
						currentTime = parseInt(currentTime) + 1;
						countdown_proc(currentTime,el)
					}				
				},1000));
			} else if(customRange) {
				eventDate = Math.round(customRangeValues[1]);
				if (pausedTime) {
					if (!isNaN(pausedTime)) {
						var currentTime = eventDate - pausedTime;
					}
				} else {
					var currentTime = Math.round(customRangeValues[0]);
				}
				countdown_proc(currentTime,el);
				$(el).data("jC_interval", setInterval(function(){
					if(endCounter == false) {
						if(customRangeDownCount) {
							currentTime = parseInt(currentTime) - 1;
						} else {
							currentTime = parseInt(currentTime) + 1;
						}
						countdown_proc(currentTime,el);
					}				
				},1000));
			} else {
				eventDate = Date.parse($(el).data("userOptions").date) / 1000;
				if(thisEl.data("userOptions").dateSource == 'remote') {
					dateSource = remoteDateURL + '?timezone=' + thisEl.data("userOptions").timezone + '&callback=?';
				} else if(thisEl.data("userOptions").dateSource == 'local') {
					dateSource = localDateURL + '?timezone=' + thisEl.data("userOptions").timezone;
				} else {
					if(consoleLog) { console.log("(jC) Error: dateSource property can be set to 'local' or 'remote', 'remote' is default"); }
				}
			
				$.getJSON(dateSource,function(data){
					var currentDate = Date.parse(data.currentDate) / 1000;
					countdown_proc(currentDate,el);
					if (eventDate > currentDate) {
						$(el).data("jC_interval", setInterval(function(){
							if(endCounter == false) {
								currentDate = parseInt(currentDate) + 1;
								countdown_proc(currentDate,el)
							}				
						},1000));
					} else {
						resetHTMLCounter(el)
					}
				}); 
			}
			
		}

		//main jCounter processor
		function countdown_proc(duration,el) {
			//check if the counter needs to count down or up
			if(customRangeDownCount) {
				if(eventDate >= duration) {
					clearInterval($(el).data("jC_interval"));
					if(thisEl.data("userOptions").fallback) {
						thisEl.data("userOptions").fallback.call(this);
					}
					
				}
			} else {
				if(eventDate <= duration) {
					clearInterval($(el).data("jC_interval"));
					if(thisEl.data("userOptions").fallback) {
						thisEl.data("userOptions").fallback.call(this);
					}
					
				}
			}
			
			//if customRange is used, update the seconds variable
			var seconds = (customRange) ? duration : eventDate - duration;

			var thisInstanceFormat = thisEl.data("userOptions").format;
			
			//calculate seconds into days,hours,minutes,seconds
			//if dd (days) is specified in the format setting (i.e. format: 'dd:hh:mm:ss')
			if(thisInstanceFormat.indexOf('dd') != -1)  {
				var days = Math.floor(seconds / (60 * 60 * 24)); //calculate the number of days
				seconds -= days * 60 * 60 * 24; //update the seconds variable with no. of days removed
			}
			//if hh (hours) is specified
			if(thisInstanceFormat.indexOf('hh') != -1)  {
				var hours = Math.floor(seconds / (60 * 60));
				seconds -= hours * 60 * 60; //update the seconds variable with no. of hours removed
			}
			//if mm (minutes) is specified
			if(thisInstanceFormat.indexOf('mm') != -1)  {
				var minutes = Math.floor(seconds / 60);
				seconds -= minutes * 60; //update the seconds variable with no. of minutes removed
			}
			//if ss (seconds) is specified
			if(thisInstanceFormat.indexOf('ss') == -1)  {
				seconds -= seconds; //if ss is unspecified in format, update the seconds variable to 0;
			}

			//conditional Ss
			//updates the plural and singular labels accordingly
			if (days == 1) { $(el).find(".textDays").text(singularLabels[0]); } else { $(el).find(".textDays").text(pluralLabels[0]); }
			if (hours == 1) { $(el).find(".textHours").text(singularLabels[1]); } else { $(el).find(".textHours").text(pluralLabels[1]); }
			if (minutes == 1) { $(el).find(".textMinutes").text(singularLabels[2]); } else { $(el).find(".textMinutes").text(pluralLabels[2]); }
			if (seconds == 1) { $(el).find(".textSeconds").text(singularLabels[3]); } else { $(el).find(".textSeconds").text(pluralLabels[3]); }
			
			//twoDigits ON setting
			//if the twoDigits setting is set to ON, jCounter will always diplay a minimum number of 2 digits
			if(thisEl.data("userOptions").twoDigits == 'on') {
				days = (String(days).length >= 2) ? days : "0" + days;
				hours = (String(hours).length >= 2) ? hours : "0" + hours;
				minutes = (String(minutes).length >= 2) ? minutes : "0" + minutes;
				seconds = (String(seconds).length >= 2) ? seconds : "0" + seconds;
			}

			//updates the jCounter's html values
			if(!isNaN(eventDate)) {
				$(el).find(".days").text(days);
				$(el).find(".hours").text(hours);
				$(el).find(".minutes").text(minutes);
				$(el).find(".seconds").text(seconds);
			} else { 
				if(consoleLog) { console.log("(jC) Error: Invalid date! Here's an example: 01 January 1970 12:00:00"); }
				clearInterval($(el).data("jC_interval"));
			}
			//stores the remaining time when pausing jCounter
			$(el).data("jC_pausedTime", eventDate-duration);
		}
		
		//updates jCounter's HTML values to 0 or 00, based on the twoDigits setting
		function resetHTMLCounter(el) {
			if(thisEl.data("userOptions").twoDigits == 'on') {
				$(el).find(".days,.hours,.minutes,.seconds").text('00');
			} else if(thisEl.data("userOptions").twoDigits == 'off') {
				$(el).find(".days,.hours,.minutes,.seconds").text('0');
			}
		}
		
		//method calling logic
		if ( jC_methods[this.options] ) {
			return jC_methods[ this.options ].apply( this, Array.prototype.slice.call( arguments, 1 ));
		} else if ( typeof this.options === 'object' || ! this.options ) {
			return jC_methods.init.apply( this, arguments );
		} else {
			console.log('(jC) Error: Method >>> ' +  this.options + ' <<< does not exist.' );
		} 

	}
	//the end;
}) (jQuery,document,window);
(function() {
    "use strict";
    var defaultOptions = {
        templates: {
            player: '<div class="player">' +
                '<div class="playControl"></div>' +
                '<div class="currentTime"></div>' +
                '<div class="timeBarContainer"><div class="bufferedBar"></div><div class="timeBar"></div><div class="cursor"></div></div>' +
                '<div class="duration"></div>' +
                '<div class="volume"></div>' +
                '<div class="volumeBarContainer"><div class="volumeBar"></div><div class="cursor"></div></div>' +
                '<div class="screenControl expand"></div>' +
                '</div>',
            spinner: '<div class="whirly-loader">Loading…</div>',
            contextMenu: '<div class="separator">Set speed at</div><div data-action="speed1x">x1</div><div data-action="speed1.25x">x1.25</div><div data-action="speed1.5x">x1.5</div><div data-action="speed2x">x2</div>'
        },
        useHD: false,
        showHours: false,
        selectors: {
            playControl: ".playControl",
            volume: ".volume",
            timeBarContainer: ".timeBarContainer",
            timeBar: ".timeBar",
            timeCursor: ".timeBarContainer .cursor",
            volumeBarContainer: ".volumeBarContainer",
            volumeBar: ".volumeBar",
            volumeCursor: ".volumeBarContainer .cursor",
            currentTime: ".currentTime",
            duration: ".duration",
            screenControl: ".screenControl",
            bufferedBar: ".bufferedBar"
        },
    };
    window.Vanilla = {
        instances: {},
        instancesIncr: 0,
        proxyURL: "proxy.php?url=",
        replace: function(selector) {
            var node = document.querySelector(selector);
            return new Vanilla.Player({
                replaceNode: node
            });
        },
        replaceAll: function() {
            var nodes = document.querySelectorAll("audio,video");
            for (var i = 0; i < nodes.length; i++) {
                new Vanilla.Player({
                    replaceNode: nodes[i]
                });
            }
            return this.instances;
        }
    };
    window.Vanilla.Player = function Player(options) {
        for (var option in defaultOptions) {
            if (!options.hasOwnProperty(option)) {
                options[option] = defaultOptions[option];
            }
        }
        this.options = options;
        this.nodes = {};
        this._setupPlayer();
    };
    window.Vanilla.Player.prototype = {
        play: function() {
            this.nodes.mediaNode.play();
        },
        pause: function() {
            this.nodes.mediaNode.pause();
        },
        mute: function() {
            this.nodes.mediaNode.muted = true;
        },
        unmute: function() {
            this.nodes.mediaNode.muted = false;
        },
        getVolume: function() {
            return this.nodes.mediaNode.volume;
        },
        setVolume: function(volume) {
            volume = parseFloat(volume);
            if (!isNaN(volume)) {
                if (volume > 1) {
                    volume = volume / 100;
                    if (volume > 1) {
                        volume = 1;
                    }
                }
                if (volume < 0) {
                    volume = 0;
                }
                this.nodes.mediaNode.volume = volume;
            }
        },
        getSpeed: function() {
            return this.nodes.mediaNode.playbackRate;
        },
        setSpeed: function(speed) {
            speed = parseFloat(speed);
            if (!isNaN(speed)) {
                this.nodes.mediaNode.playbackRate = speed;
            }
        },
        getCurrentTime: function(raw) {
            if (raw) {
                return this.nodes.mediaNode.currentTime;
            }
            return this._secondsToString(this.nodes.mediaNode.currentTime);
        },
        setCurrentTime: function(time) {
            try {
                if (isNaN(time)) {
                    this.nodes.mediaNode.currentTime = this._stringToSeconds(time);
                } else {
                    this.nodes.mediaNode.currentTime = time;
                }
            } catch (e) {

            }
        },
        getDuration: function() {
            return this._secondsToString(this.nodes.mediaNode.duration);
        },
        getSource: function() {
            return this.nodes.mediaNode.getAttribute("src");
        },
        setSource: function(source) {
            if (this.errorState) {
                this.errorState = false;
                this.nodes.message.style.display = "none";
            }
            this.pause();
            this.setCurrentTime(0);
            var match = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
            if (match.test(source)) {
                this._getYoutubeLink(match.exec(source)[1]);
            } else {
                this.nodes.mediaNode.src = source;
            }
        },
        getSources: function() {
            var sourceNodes = this.nodes.mediaNode.querySelectorAll("source");
            var sourceLinks = [];
            for (var i = 0; i < sourceNodes.length; i++) {
                sourceLinks.push(sourceNodes[i].getAttribute("src"));
            }
            return sourceLinks;
        },
        setSources: function(sources) {
            this.pause();
            this.setCurrentTime(0);
            var currentSources = this.nodes.mediaNode.querySelectorAll("source");
            for (var i = 0; i < currentSources.length; i++) {
                this.nodes.mediaNode.removeChild(currentSources[i]);
            }
            if (!Array.isArray(sources)) {
                sources = [sources];
            }
            for (var i = 0; i < sources.length; i++) {
                var sourceNode = document.createElement("source");
                sourceNode.src = sources[i];
                this.nodes.mediaNode.appendChild(sourceNode);
            }
            this.nodes.mediaNode.src = sources[0];
        },
        getTracks: function() {
            return this.nodes.mediaNode.textTracks;
        },
        setTracks: function(tracks) {
            var currentTracks = this.nodes.mediaNode.querySelectorAll("track");
            for (var i = 0; i < currentTracks.length; i++) {
                this.nodes.mediaNode.removeChild(currentTracks[i]);
            }
            var currentTracksMenu = this.nodes.contextmenu.querySelectorAll("div[data-track]");
            for (var i = 0; i < currentTracksMenu.length; i++) {
                this.nodes.contextmenu.removeChild(currentTracksMenu[i]);
            }
            for (var i = 0; i < tracks.length; i++) {
                var track = document.createElement("track");
                track.kind = tracks[i].kind;
                track.language = tracks[i].language;
                track.label = tracks[i].label || '';
                track.id = tracks[i].id || '';
                track.src = tracks[i].src;
                this.nodes.mediaNode.appendChild(track);
            }
        },
        on: function(event, callback) {
            this.nodes.mediaNode.addEventListener(event, callback, true);
            var self = this;
            return {
                callback: callback,
                remove: function() {
                    self.nodes.mediaNode.removeEventListener(event, callback, true);
                }
            };
        },
        emit: function(event) {
            self.nodes.mediaNode.dispatchEvent(new Event(event));
        },
        show: function() {
            if (!this.errorState) {
                var self = this;
                if (this.nodes.player.style.opacity === "") {
                    this.nodes.player.style.opacity = 0;
                }
                clearInterval(this.showTimer);
                clearInterval(this.hideTimer);
                clearTimeout(this.idleTimer);
                this.showTimer = setInterval(function() {
                    if (self.nodes.player.style.opacity < 1) {
                        self.nodes.player.style.opacity = parseFloat(self.nodes.player.style.opacity) + 0.1;
                    } else {
                        clearInterval(self.showTimer);
                    }
                }, 25);
                if (this.nodes.player.parentNode.querySelector(":hover") !== this.nodes.player) {
                    this.idleTimer = setTimeout(function() {
                        self.hide();
                    }, 2000);
                }
            }
        },
        hide: function() {
            var self = this;
            clearInterval(this.hideTimer);
            clearInterval(this.showTimer);
            if (this.nodes.player.style.opacity === "") {
                this.nodes.player.style.opacity = 1.0;
            }
            this.hideTimer = setInterval(function() {
                if (self.nodes.player.style.opacity > 0) {
                    self.nodes.player.style.opacity = parseFloat(self.nodes.player.style.opacity).toFixed(1) - 0.1;
                } else {
                    clearInterval(self.hideTimer);
                }
            }, 25);
        },
        destroy: function() {
            this.onDestroy();
            this.nodes.player.parentNode.removeChild(this.nodes.player);
            delete Vanilla.instances[this.id];
        },
        resize: function(width, height) {
            if (width === undefined || height === undefined) {
                return;
            }
            if (this.nodes.mediaNode.nodeName === "VIDEO") {
                this.nodes.container.style.width = width + "px";
                this.nodes.container.style.height = height + "px";
                this.nodes.player.style.width = this.nodes.container.offsetWidth * 0.8 + "px";
                this.nodes.player.style.top = this.nodes.container.offsetHeight - this.nodes.player.offsetHeight * 2 - 10 + "px";
                this.nodes.player.style.left = this.nodes.container.offsetWidth / 2 - this.nodes.player.offsetWidth / 2 + "px";
                this.nodes.timeBarContainer.style.width = this.nodes.mediaNode.clientWidth * 0.8 -
                    (
                        this.nodes.playControl.clientWidth +
                        this.nodes.currentTime.clientWidth +
                        this.nodes.duration.clientWidth +
                        this.nodes.volume.clientWidth +
                        this.nodes.volumeBarContainer.clientWidth +
                        this.nodes.screenControl.clientWidth +
                        parseInt(getComputedStyle(this.nodes.playControl).getPropertyValue("margin-left").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.currentTime).getPropertyValue("margin-left").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.duration).getPropertyValue("margin-left").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.volume).getPropertyValue("margin-left").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.volumeBarContainer).getPropertyValue("margin-left").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.screenControl).getPropertyValue("margin-left").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.timeBarContainer).getPropertyValue("margin-left").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.playControl).getPropertyValue("margin-right").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.currentTime).getPropertyValue("margin-right").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.duration).getPropertyValue("margin-right").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.volume).getPropertyValue("margin-right").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.volumeBarContainer).getPropertyValue("margin-right").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.screenControl).getPropertyValue("margin-right").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.timeBarContainer).getPropertyValue("margin-right").replace("px", ""))
                    ) + "px";
            } else {
                this.nodes.player.style.width = width + "px";
                this.nodes.player.style.height = height + "px";
                this.nodes.timeBarContainer.style.width = this.nodes.player.clientWidth -
                    (
                        this.nodes.playControl.clientWidth +
                        this.nodes.currentTime.clientWidth +
                        this.nodes.duration.clientWidth +
                        this.nodes.volume.clientWidth +
                        this.nodes.volumeBarContainer.clientWidth +
                        this.nodes.screenControl.clientWidth +
                        parseInt(getComputedStyle(this.nodes.playControl).getPropertyValue("margin-left").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.currentTime).getPropertyValue("margin-left").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.duration).getPropertyValue("margin-left").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.volume).getPropertyValue("margin-left").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.volumeBarContainer).getPropertyValue("margin-left").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.screenControl).getPropertyValue("margin-left").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.timeBarContainer).getPropertyValue("margin-left").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.playControl).getPropertyValue("margin-right").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.currentTime).getPropertyValue("margin-right").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.duration).getPropertyValue("margin-right").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.volume).getPropertyValue("margin-right").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.volumeBarContainer).getPropertyValue("margin-right").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.screenControl).getPropertyValue("margin-right").replace("px", "")) +
                        parseInt(getComputedStyle(this.nodes.timeBarContainer).getPropertyValue("margin-right").replace("px", ""))
                    ) + "px";
            }
        },
        _addTracksToContextMenu: function() {
            var self = this;
            if (this.nodes.mediaNode.textTracks.length > 0 && this.nodes.contextmenu) {
                var submenu = document.createElement("div");
                submenu.innerHTML = "Subtitles";
                submenu.classList.add("separator");
                this.nodes.contextmenu.appendChild(submenu);
                var suboff = document.createElement("div");
                suboff.innerHTML = "Off";
                suboff.addEventListener("click", function(evt) {
                    for (var i = 0; i < self.nodes.mediaNode.textTracks.length; i++) {
                        self.nodes.mediaNode.textTracks[i].mode = 'hidden';
                    }
                    evt.stopImmediatePropagation();
                });
                this.nodes.contextmenu.appendChild(suboff);
                for (var i = 0; i < this.nodes.mediaNode.textTracks.length; i++) {
                    this.nodes.mediaNode.textTracks[i].mode = 'hidden';
                    var track = document.createElement("div");
                    track.innerHTML = this.nodes.mediaNode.textTracks[i].label;
                    track.setAttribute("data-track", i);
                    track.addEventListener("click", function(evt) {
                        self.nodes.mediaNode.textTracks[track.getAttribute("data-track")].mode = 'showing';
                        self.nodes.contextmenu.style.display = "none";
                        evt.stopImmediatePropagation();
                    }, true);
                    this.nodes.contextmenu.appendChild(track);
                }
            }
        },
        showError: function(message) {
            this.errorState = true;
            this.hide();
            if (!this.nodes.message) {
                this.nodes.message = document.createElement("div");
                this.nodes.container.appendChild(this.nodes.message);
            }
            this.nodes.message.innerHTML = message;
            this.nodes.message.style.position = "absolute";
            this.nodes.message.style.left = this.nodes.container.getBoundingClientRect().width / 2 - this.nodes.message.getBoundingClientRect().width / 2 + "px";
            this.nodes.message.style.top = this.nodes.container.getBoundingClientRect().height / 2 - this.nodes.message.getBoundingClientRect().height / 2 + "px";
            this.nodes.spinner.style.display = "none";
        },
        _getYoutubeLink: function(id) {
            var self = this;
            var xhr = new XMLHttpRequest();
            this.nodes.spinner.style.display = "block";
            xhr.open("GET", Vanilla.proxyURL + encodeURIComponent("http://www.youtube.com/get_video_info?video_id=" + id + "&asv=3&el=detailpage&hl=en_US"), true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState != 4 || xhr.status != 200) {
                    return;
                }
                var response = xhr.responseText;
                response = response.split("&");
                var _response = {};
                for (var i = 0; i < response.length; i++) {
                    var element = response[i].split("=");
                    _response[element[0]] = element[1];
                }
                response = _response;
                if (response.status === "fail") {
                    return;
                }
                var streamMap = decodeURIComponent(response.url_encoded_fmt_stream_map).split(",");
                var formats = [];
                for (var i = 0; i < streamMap.length; i++) {
                    var entry = streamMap[i].split("&");
                    var format = {};
                    for (var j = 0; j < entry.length; j++) {
                        var _entry = entry[j].split("=");
                        format[_entry[0]] = decodeURIComponent(_entry[1]);
                    }
                    formats.push(format);
                }
                var itags;
                if (self.options.useHD) {
                    itags = ["37", "22", "18"];
                } else {
                    itags = ["18"];
                }
                var url = "";
                for (var i = 0; i < itags.length; i++) {
                    for (var j = 0; j < formats.length; j++) {
                        if (formats[j].itag === itags[i]) {
                            if (response.ptk !== "youtube_none" && (formats[j].s || formats[j].sig)) {
                                var signature = Vanilla.decodeYT(formats[j].s || formats[j].sig);
                                url = formats[j].url + "&signature=" + signature;
                            } else {
                                url = formats[j].url;
                            }
                            break;
                        }
                    }
                    if (url !== "") {
                        self.nodes.mediaNode.src = url;
                        self.nodes.spinner.style.display = "none";
                        break;
                    }
                }
            };
            xhr.send(null);
        },
        _secondsToString: function(time) {
            if (isNaN(time)) {
                time = 0;
            }
            var modulus = time;
            var string = "";
            var length;
            if (this.options.showHours) {
                length = [3600, 60, 1];
            } else {
                length = [60, 1];
            }
            for (var i = 0; i < length.length; i++) {
                var result = parseInt(Math.floor(modulus / length[i]));
                modulus = modulus % length[i];
                if (result < 10) {
                    result = "0" + result;
                }
                if (i < length.length - 1) {
                    result = result + ":";
                }
                string = string + result;
            }
            return string;
        },
        _stringToSeconds: function(time) {
            var seconds = 0;
            var length;
            if (this.options.showHours) {
                length = [1, 60, 3600];
            } else {
                length = [1, 60];
            }
            time = time.split(":");
            time.reverse();
            for (var i = 0; i < time.length; i++) {
                seconds += parseInt(time[i]) * length[i];
            }
            return seconds;
        },
        _setupPlayer: function() {
            if (!this._setup) {
                var div = document.createElement("div");
                div.innerHTML = this.options.templates.player;
                this.nodes.player = div.firstChild;
                this.nodes.mediaNode = this.options.replaceNode;
                this.nodes.mediaNode.controls = false;
                var id = this.options.replaceNode.getAttribute("id");
                if (id !== null) {
                    Vanilla.instances[id] = this;
                } else {
                    id = "VanillaPlayer_" + Vanilla.instancesIncr;
                    Vanilla.instances["VanillaPlayer_" + Vanilla.instancesIncr] = this;
                    Vanilla.instancesIncr++;
                }
                this.nodes.mediaNode.removeAttribute("id");
                this.nodes.player.id = id;
                this.nodes.player.classList.add(this.nodes.mediaNode.nodeName.toLowerCase());
                this.nodes.player.addEventListener("click", function(evt) {
                    evt.stopImmediatePropagation();
                });
                this.id = id;
                for (var selector in this.options.selectors) {
                    this.nodes[selector] = this.nodes.player.querySelector(this.options.selectors[selector]);
                }
                var self = this;
                var isDraggingTime = false;
                var isPaused = true;
                this.nodes.volumeBar.style.width = (this.nodes.volumeBarContainer.clientWidth - this.nodes.volumeCursor.clientWidth) + "px";
                this.nodes.mediaNode.addEventListener("play", function(evt) {
                    if (!isDraggingTime) {
                        self.nodes.playControl.classList.remove("play");
                        self.nodes.playControl.classList.add("pause");
                    }
                }, true);
                this.nodes.mediaNode.addEventListener("pause", function(evt) {
                    if (!isDraggingTime) {
                        self.nodes.playControl.classList.remove("pause");
                        self.nodes.playControl.classList.add("play");
                    }
                }, true);
                this.nodes.mediaNode.addEventListener("volumechange", function(evt) {
                    self.nodes.volumeBar.style.width = ((self.nodes.mediaNode.volume * self.nodes.volumeBarContainer.clientWidth) / 1.0) - ((self.nodes.mediaNode.volume * self.nodes.volumeCursor.clientWidth) / 1.0) + "px";
                    if (!self.nodes.mediaNode.muted) {
                        self.nodes.volume.classList.remove(self.nodes.volume.classList[1]);
                        var volume = self.nodes.mediaNode.volume;
                        if (volume < 0.1) {
                            self.nodes.volume.classList.add("off");
                        } else {
                            if (volume > 0.5) {
                                self.nodes.volume.classList.add("max");
                            } else {
                                self.nodes.volume.classList.add("min");
                            }
                        }
                    }
                }, true);
                this.nodes.mediaNode.addEventListener("timeupdate", function(evt) {
                    self.nodes.timeBar.style.width = ((self.nodes.mediaNode.currentTime * self.nodes.timeBarContainer.clientWidth) / self.nodes.mediaNode.duration) - ((self.nodes.mediaNode.currentTime * self.nodes.timeCursor.clientWidth) / self.nodes.mediaNode.duration) + "px";
                    self.nodes.currentTime.innerHTML = self._secondsToString(self.nodes.mediaNode.currentTime);
                }, true);
                this.nodes.mediaNode.addEventListener("durationchange", function(evt) {
                    self.nodes.duration.innerHTML = self._secondsToString(self.nodes.mediaNode.duration);
                    var width = "72px";
                    self.nodes.currentTime.style.width = width;
                    self.nodes.duration.style.width = width;
                }, true);
                this.nodes.mediaNode.addEventListener("progress", function(evt) {
                    try {
                        var index = 0;
                        for (var i = 0; i < self.nodes.mediaNode.buffered.length; i++) {
                            if (self.nodes.mediaNode.currentTime >= self.nodes.mediaNode.buffered.start(i) && self.nodes.mediaNode.currentTime <= self.nodes.mediaNode.buffered.end(i)) {
                                index = i;
                                break;
                            }
                        }
                        var bufferedEnd = self.nodes.mediaNode.buffered.end(index);
                        var bufferedBegin = self.nodes.mediaNode.buffered.start(index);
                        self.nodes.bufferedBar.style.left = (bufferedBegin * self.nodes.timeBarContainer.clientWidth) / self.nodes.mediaNode.duration + "px";
                        self.nodes.bufferedBar.style.width = ((bufferedEnd - bufferedBegin) * self.nodes.timeBarContainer.clientWidth) / self.nodes.mediaNode.duration + "px";
                    } catch (e) {

                    }
                }, true);
                var errorListener = function(evt) {
                    self.showError("error");
                };
                this.nodes.mediaNode.addEventListener("error", errorListener, true);
                var sources = this.nodes.mediaNode.querySelectorAll("sources");
                for (var i = 0; i < sources.length; i++) {
                    sources[i].addEventListener("error", errorListener, true);
                }
                this.nodes.playControl.addEventListener("click", function(evt) {
                    if (!self.nodes.mediaNode.paused) {
                        self.nodes.mediaNode.pause();
                    } else {
                        self.nodes.mediaNode.play();
                    }
                    evt.stopImmediatePropagation();
                }, true);
                this.nodes.timeBarContainer.addEventListener("click", function(evt) {
                    var position = evt.clientX - self.nodes.timeBarContainer.getBoundingClientRect().left;
                    if (!isNaN(self.nodes.mediaNode.duration)) {
                        self.nodes.mediaNode.currentTime = (position * self.nodes.mediaNode.duration) / self.nodes.timeBarContainer.clientWidth;
                    }
                    evt.stopImmediatePropagation();
                }, true);
                this.nodes.volumeBarContainer.addEventListener("click", function(evt) {
                    var position = evt.clientX - self.nodes.volumeBarContainer.getBoundingClientRect().left;
                    self.nodes.mediaNode.volume = position / self.nodes.volumeBarContainer.clientWidth;
                    evt.stopImmediatePropagation();
                }, true);
                var hoverTime = document.createElement("div");
                this.nodes.hoverTime = hoverTime.classList.add("hoverTime");
                this.nodes.timeBarContainer.addEventListener("mousedown", function(evt) {
                    hoverTime.innerHTML = '';
                    isDraggingTime = true;
                    isPaused = self.nodes.mediaNode.paused;
                }, true);
                this.nodes.timeBarContainer.insertBefore(hoverTime, this.nodes.bufferedBar);
                this.nodes.timeBarContainer.addEventListener("mousemove", function(evt) {
                    if (!isDraggingTime) {
                        var position = evt.clientX - self.nodes.timeBarContainer.getBoundingClientRect().left;
                        var time = (position * self.nodes.mediaNode.duration) / self.nodes.timeBarContainer.clientWidth;
                        if (time <= self.nodes.mediaNode.duration) {
                            hoverTime.style.left = position + "px";
                            hoverTime.innerHTML = "<div>" + self._secondsToString(time) + "</div>";
                        } else {
                            hoverTime.innerHTML = '';
                        }
                    }
                }, true);
                this.nodes.timeBarContainer.addEventListener("mouseleave", function(evt) {
                    hoverTime.innerHTML = '';
                }, true);
                hoverTime.addEventListener("mouseenter", function(evt) {
                    hoverTime.innerHTML = '';
                }, true);
                var timeMouseMoveListener = function(evt) {
                    if (isDraggingTime && evt.button === 0) {
                        if (isPaused === false) {
                            self.nodes.mediaNode.pause();
                        }
                        var position = evt.clientX - self.nodes.timeBarContainer.getBoundingClientRect().left;
                        if (position < 0) {
                            position = 0;
                        }
                        if (position > self.nodes.timeBarContainer.clientWidth) {
                            position = self.nodes.timeBarContainer.clientWidth;
                        }
                        if (!isNaN(self.nodes.mediaNode.duration)) {
                            self.nodes.mediaNode.currentTime = (position * self.nodes.mediaNode.duration) / self.nodes.timeBarContainer.clientWidth;
                        }
                    }
                };
                var timeMouseUpListener = function(evt) {
                    if (isDraggingTime) {
                        isDraggingTime = false;
                        if (isPaused === false) {
                            self.nodes.mediaNode.play();
                        }
                    }
                };
                var keyDownListener = function(evt) {
                    if (evt.keyCode === 32 && document.activeElement === self.nodes.mediaNode) {
                        if (self.nodes.mediaNode.paused) {
                            self.nodes.mediaNode.play();
                        } else {
                            self.nodes.mediaNode.pause();
                        }
                    }
                    if (evt.keyCode === 39) {
                        self.show();
                        if (self.nodes.mediaNode.currentTime + 2 < self.nodes.mediaNode.duration) {
                            self.nodes.mediaNode.currentTime += 2;
                        } else {
                            self.nodes.mediaNode.currentTime = self.nodes.mediaNode.duration;
                        }
                    }
                    if (evt.keyCode === 37) {
                        self.show();
                        if (self.nodes.mediaNode.currentTime - 2 > 0) {
                            self.nodes.mediaNode.currentTime -= 2;
                        } else {
                            self.nodes.mediaNode.currentTime = 0;
                        }
                    }
                };
                window.addEventListener("keydown", keyDownListener, true);
                window.addEventListener("mousemove", timeMouseMoveListener, true);
                window.addEventListener("mouseup", timeMouseUpListener, true);
                var isDraggingVolume = false;
                this.nodes.volumeBarContainer.addEventListener("mousedown", function(evt) {
                    isDraggingVolume = true;
                }, true);
                this.nodes.volume.addEventListener("click", function() {
                    self.nodes.mediaNode.muted = !self.nodes.mediaNode.muted;
                    self.nodes.volume.classList.remove(self.nodes.volume.classList[1]);
                    if (self.nodes.mediaNode.muted) {
                        self.nodes.volume.classList.add("muted");
                    } else {
                        var volume = self.nodes.mediaNode.volume;
                        if (volume === 0) {
                            self.nodes.volume.classList.add("off");
                        }
                        if (volume > 0.5) {
                            self.nodes.volume.classList.add("max");
                        } else {
                            self.nodes.volume.classList.add("min");
                        }
                    }
                }, true);
                var volumeMouseMoveListener = function(evt) {
                    if (isDraggingVolume && evt.button === 0) {
                        var position = evt.clientX - self.nodes.volumeBarContainer.getBoundingClientRect().left;
                        if (position < 0) {
                            position = 0;
                        }
                        if (position > self.nodes.volumeBarContainer.clientWidth) {
                            position = self.nodes.volumeBarContainer.clientWidth;
                        }
                        self.nodes.mediaNode.volume = position / self.nodes.volumeBarContainer.clientWidth;
                    }
                };
                var volumeMouseUpListener = function(evt) {
                    isDraggingVolume = false;
                };
                window.addEventListener("mousemove", volumeMouseMoveListener);
                window.addEventListener("mouseup", volumeMouseUpListener);
                this.nodes.mediaNode.dispatchEvent(new Event("pause"));
                this.nodes.mediaNode.dispatchEvent(new Event("timeupdate"));
                this.nodes.mediaNode.dispatchEvent(new Event("durationchange"));
                if (this.nodes.mediaNode.nodeName === "VIDEO") {
                    this.fullscreen = false;
                    this.nodes.container = document.createElement("div");
                    this.nodes.container.classList.add("VanillaPlayerContainer");
                    this.nodes.container.style.width = this.nodes.mediaNode.offsetWidth + "px";
                    this.nodes.container.style.height = this.nodes.mediaNode.offsetHeight + "px";
                    this.nodes.container.style.position = "relative";
                    this.nodes.mediaNode.parentNode.insertBefore(this.nodes.container, this.nodes.mediaNode);
                    this.nodes.container.appendChild(this.nodes.mediaNode);
                    this.nodes.container.appendChild(this.nodes.player);
                    this.nodes.mediaNode.style.width = "100%";
                    this.nodes.mediaNode.style.height = "100%";
                    this.nodes.mediaNode.tabIndex = 0;
                    this.nodes.mediaNode.removeAttribute("width");
                    this.nodes.mediaNode.removeAttribute("height");
                    this.resize(this.nodes.mediaNode.offsetWidth, this.nodes.mediaNode.offsetHeight);
                    this.nodes.player.style.position = "absolute";
                    this.nodes.player.style.opacity = 0;
                    this.nodes.container.addEventListener("mousemove", function() {
                        self.show();
                    }, true);
                    this.nodes.container.addEventListener("mouseleave", function() {
                        self.hide();
                    }, true);
                    var contextmenu = document.createElement("div");
                    contextmenu.innerHTML = self.options.templates.contextMenu;
                    this.nodes.contextmenu = contextmenu;
                    contextmenu.style.position = "absolute";
                    contextmenu.style.display = "none";
                    contextmenu.classList.add("contextmenu");
                    this.nodes.container.appendChild(contextmenu);
                    this.nodes.mediaNode.addEventListener("contextmenu", function(evt) {
                        if (!self.errorState) {
                            self.nodes.mediaNode.focus();
                            contextmenu.style.display = "block";
                            contextmenu.style.left = evt.layerX + "px";
                            contextmenu.style.top = evt.layerY + "px";
                        }
                        evt.preventDefault();
                    }, true);
                    var menus = contextmenu.querySelectorAll("div");
                    for (var i = 0; i < menus.length; i++) {
                        menus[i].addEventListener("click", function(evt) {
                            var action = evt.target.getAttribute("data-action") || "";
                            var speed = action.match(/speed(\d\.?\d*)x/);
                            if (speed !== null) {
                                self.setSpeed(speed[1]);
                            }
                            contextmenu.style.display = "none";
                            evt.stopImmediatePropagation();
                        }, true);
                    }
                    this._addTracksToContextMenu();
                    var isCursorIn = false;
                    this.nodes.container.addEventListener("mouseleave", function(evt) {
                        isCursorIn = false;
                    });
                    this.nodes.container.addEventListener("mouseover", function(evt) {
                        isCursorIn = true;
                    });
                    this.nodes.mediaNode.addEventListener("blur", function(evt) {
                        if (!isCursorIn) {
                            contextmenu.style.display = "none";
                        }
                    });
                    this.nodes.mediaNode.addEventListener("click", function(evt) {
                        if (!self.errorState) {
                            self.nodes.mediaNode.focus();
                            if (contextmenu.style.display === "block") {
                                contextmenu.style.display = "none";
                            } else {
                                if (self.nodes.mediaNode.paused) {
                                    self.nodes.mediaNode.play();
                                } else {
                                    self.nodes.mediaNode.pause();
                                }
                            }
                        }
                    });
                    this.nodes.mediaNode.addEventListener("wheel", function(evt) {
                        var delta = -evt.deltaY / 2000;
                        self.show();
                        if (self.nodes.mediaNode.volume + delta > 1) {
                            self.nodes.mediaNode.volume = 1;
                        } else if (self.nodes.mediaNode.volume + delta < 0) {
                            self.nodes.mediaNode.volume = 0;
                        } else {
                            self.nodes.mediaNode.volume += delta;
                        }
                    }, true);
                    var spinner = document.createElement("div");
                    this.nodes.container.appendChild(spinner);
                    spinner.innerHTML = this.options.templates.spinner;
                    spinner.style.position = "absolute";
                    spinner.style.left = this.nodes.container.getBoundingClientRect().width / 2 - spinner.getBoundingClientRect().width / 2 + "px";
                    spinner.style.top = this.nodes.container.getBoundingClientRect().height / 2 - spinner.getBoundingClientRect().height / 2 + "px";
                    spinner.style.display = "none";
                    this.nodes.spinner = spinner;
                    this.nodes.mediaNode.addEventListener("seeking", function(evt) {
                        spinner.style.display = "block";
                    }, true);
                    this.nodes.mediaNode.addEventListener("seeked", function(evt) {
                        spinner.style.display = "none";
                    }, true);
                    this.nodes.mediaNode.addEventListener("waiting", function(evt) {
                        spinner.style.display = "block";
                    }, true);
                    this.nodes.mediaNode.addEventListener("playing", function(evt) {
                        spinner.style.display = "none";
                    }, true);
                    this.nodes.player.addEventListener("mouseenter", function() {
                        clearTimeout(self.idleTimer);
                    }, true);
                    this.nodes.player.addEventListener("mouseleave", function() {
                        self.idleTimer = setTimeout(function() {
                            self.hide();
                        }, 2000);
                        hoverTime.innerHTML = '';
                    }, true);
                    this.nodes.screenControl.addEventListener("click", function() {
                        if (!document.fullscreenElement && !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
                            if (self.nodes.container.requestFullscreen) {
                                self.nodes.container.requestFullscreen();
                            } else if (self.nodes.container.mozRequestFullScreen) {
                                self.nodes.container.mozRequestFullScreen();
                            } else if (self.nodes.container.webkitRequestFullscreen) {
                                self.nodes.container.webkitRequestFullscreen();
                            } else if (self.nodes.container.msRequestFullscreen) {
                                self.nodes.container.msRequestFullscreen();
                            }
                        } else {
                            if (document.cancelFullScreen) {
                                document.cancelFullScreen();
                            } else if (document.mozCancelFullScreen) {
                                document.mozCancelFullScreen();
                            } else if (document.webkitCancelFullScreen) {
                                document.webkitCancelFullScreen();
                            } else if (document.msExitFullscreen) {
                                document.msExitFullscreen();
                            }
                        }
                    }, true);
                    var reposition = function() {
                        self.fullscreen = !self.fullscreen;
                        self.nodes.screenControl.classList.remove(self.nodes.screenControl.classList[1]);
                        self.nodes.player.position = "";
                        if (self.fullscreen) {
                            self.nodes.screenControl.classList.add("compress");
                            self.nodes.player.style["z-index"] = 2147483647;
                            self.nodes.player.style.top = screen.height - self.nodes.player.offsetHeight - self.nodes.player.offsetHeight * 2 - 10 + "px";
                            self.nodes.player.style.left = screen.width / 2 - self.nodes.player.offsetWidth / 2 + "px";
                        } else {
                            self.nodes.screenControl.classList.add("expand");
                            self.nodes.player.style["z-index"] = 0;
                            self.nodes.player.style.top = self.nodes.container.offsetHeight - self.nodes.player.offsetHeight - self.nodes.player.offsetHeight * 2 - 10 + "px";
                            self.nodes.player.style.left = self.nodes.container.offsetWidth / 2 - self.nodes.player.offsetWidth / 2 + "px";
                        }
                        self.nodes.spinner.style.left = self.nodes.container.getBoundingClientRect().width / 2 - self.nodes.spinner.getBoundingClientRect().width / 2 + "px";
                        self.nodes.spinner.style.top = self.nodes.container.getBoundingClientRect().height / 2 - self.nodes.spinner.getBoundingClientRect().height / 2 + "px";
                        self.nodes.player.position = "absolute";
                    };
                    document.addEventListener("mozfullscreenchange", reposition, true);
                    document.addEventListener("webkitfullscreenchange", reposition, true);
                    document.addEventListener("MSFullscreenChange", reposition, true);
                    document.addEventListener("fullscreenchange", reposition, true);
                    this.onDestroy = function() {
                        window.removeEventListener("mousemove", timeMouseMoveListener);
                        window.removeEventListener("mouseup", timeMouseUpListener);
                        window.removeEventListener("mousemove", volumeMouseMoveListener);
                        window.removeEventListener("mouseup", volumeMouseUpListener);
                        document.removeEventListener("mozfullscreenchange", reposition);
                        document.removeEventListener("webkitfullscreenchange", reposition);
                        document.removeEventListener("MSFullscreenChange", reposition);
                        document.removeEventListener("fullscreenchange", reposition);
                        window.removeEventListener("keydown", keyDownListener);
                    };
                    var match = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
                    if (match.test(this.nodes.mediaNode.getAttribute("src"))) {
                        this._getYoutubeLink(match.exec(this.nodes.mediaNode.getAttribute("src"))[1]);
                    }
                } else {
                    this.nodes.player.removeChild(this.nodes.screenControl);
                    this.nodes.mediaNode.parentNode.replaceChild(this.nodes.player, this.nodes.mediaNode);
                    this.nodes.player.appendChild(this.nodes.mediaNode);
                    this.nodes.player.addEventListener("mouseleave", function() {
                        hoverTime.innerHTML = '';
                    }, true);
                    this.onDestroy = function() {
                        window.removeEventListener("mousemove", timeMouseMoveListener);
                        window.removeEventListener("mouseup", timeMouseUpListener);
                        window.removeEventListener("mousemove", volumeMouseMoveListener);
                        window.removeEventListener("mouseup", volumeMouseUpListener);
                        window.removeEventListener("keydown", keyDownListener);
                    };
                }
                this.nodes.mediaNode.dispatchEvent(new Event("volumechange"));
                this._setup = true;
            }
        }
    };
})();
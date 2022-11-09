(function() {
  var Terminal;

  Terminal = class Terminal {
    constructor(options) {
      var $this;
      $this = this;
      ({prefix: this.prefix, selector: this.selector, greeting: this.greeting, hardDrive: this.hardDrive, workingDirectory: this.workingDirectory} = options);
      this.workingDirectory = this.workingDirectory.replace(/^\//, "");
      if (this.greeting && this.greeting !== "") {
        this.selector.val(`${this.greeting}\n`);
      }
      this.selector.val(`${this.selector.val()}${this.prefix}`);
      this.history = [];
      this.historySelected = -1;
      this.exit = false;
      this.selector.click(function() {
        var val;
        val = $this.selector.val();
        $this.selector.val("");
        return $this.selector.val(val);
      });
      
      // handel keyboard events
      this.selector.keydown(function(e) {
        var cL, carretPosition, content, currentLine, i, output, prefix, rawLine, text;
        if ($this.exit === true) {
          return e.preventDefault();
        } else {
          content = $this.selector.val();
          cL = content;
          cL = cL.substr(content.lastIndexOf("\n") + 1);
          rawLine = cL;
          cL = cL.replace(/\s+/g, " ");
          cL = cL.replace($this.prefix, "");
          currentLine = cL;
          // delete pressed
          if (e.which === 8 && rawLine.length <= $this.prefix.length) {
            return e.preventDefault();
          } else if (e.which === 37) {
            carretPosition = $this.selector.prop("selectionStart");
            // find unselectable text
            text = $this.selector.val();
            text = text.replace(/\r?\n?[^\r\n]*$/, "");
            text = `${text}\n${$this.prefix}`;
            if (carretPosition <= text.length) {
              return e.preventDefault();
            }
          // enter pressed
          } else if (e.which === 13) {
            e.preventDefault();
            $this.historySelected = -1;
            output = null;
            // add new blank line to terminal
            $this.selector.val(`${$this.selector.val()}\n`);
            if (currentLine.replace(/^\s+/g, "") !== "") {
              $this.history.push(currentLine);
            }
            // execute each command separated by &&
            currentLine.split("&&").forEach(function(stringInput) {
              var arg, command, input;
              input = stringInput.replace(/^\s+/g, "").split(" ");
              command = input.shift();
              arg = input;
              // if command exists
              if ($this[`${command}Command`]) {
                output = $this[`${command}Command`](arg);
              // else throw error
              } else if (command !== "") {
                output = `-bash: ${command}: command not found`;
              }
              // if command has output print
              if (output) {
                return $this.selector.val(`${$this.selector.val()}${output}\n`);
              }
            });
            
            // when finished add new input line 
            // to terminal and scroll into place
            if ($this.exit === false) {
              $this.selector.val(`${$this.selector.val()}${$this.prefix}`);
            }
            return $this.selector.scrollTop($this.selector[0].scrollHeight);
          } else if (e.which === 38) {
            e.preventDefault();
            // if backwards history exsists
            if ($this.historySelected < $this.history.length - 1) {
              // check number of lines
              if ($this.selector.val().split("\n").length > 1) {
                prefix = `\n${$this.prefix}`;
              } else {
                prefix = $this.prefix;
              }
              $this.selector.val($this.selector.val().replace(/\r?\n?[^\r\n]*$/, prefix));
              i = $this.historySelected + 1;
              $this.selector.val(`${$this.selector.val()}${$this.history[$this.history.length - 1 - i]}`);
              return $this.historySelected = i;
            }
          // down arror pressed
          } else if (e.which === 40) {
            e.preventDefault();
            // check number of lines
            if ($this.selector.val().split("\n").length > 1) {
              prefix = `\n${$this.prefix}`;
            } else {
              prefix = $this.prefix;
            }
            $this.selector.val($this.selector.val().replace(/\r?\n?[^\r\n]*$/, prefix));
            if ($this.historySelected > 0) {
              i = $this.historySelected - 1;
              $this.selector.val(`${$this.selector.val()}${$this.history[$this.history.length - 1 - i]}`);
              return $this.historySelected = i;
            } else {
              // return to input line
              $this.historySelected = -1;
              return $this.selector.val($this.selector.val());
            }
          }
        }
      });
    }

    
    // ----- Terminal Commands ------      
    helpCommand() {
      return ["clear", "echo [text]", "exit", "date", "time", "history", "ls", "cd [path]", "pwd", "cat [file]", "head [file]", "tail [file]"].sort().join("\n");
    }

    clearCommand() {
      this.selector.val("");
      return null;
    }

    echoCommand(arg) {
      return arg[0];
    }

    dateCommand() {
      return new Date();
    }

    pwdCommand() {
      return `/${this.workingDirectory.replace(/\/$/, "")}`;
    }

    lsCommand(directory) {
      var $this, wd;
      $this = this;
      directory = directory[0];
      wd = [];
      this.fromDifferntLocation(directory, function() {
        wd = $this.getWorkingDirectory();
        return wd = Object.keys(wd);
      });
      return wd.join(" ");
    }

    cdCommand(destination) {
      destination = destination[0];
      // we means working directory
      if (!this.changeDirectory(destination)) {
        return `cd: ${destination}: No such directory`;
      }
    }

    rmCommand(rmPath) {
      var $this, fileName, path, wd;
      $this = this;
      rmPath = rmPath[0];
      path = rmPath.split("/");
      fileName = path.splice(-1);
      path = path.join("/");
      wd = {};
      if (path === "") {
        path = "/";
      }
      this.fromDifferntLocation(path, function() {
        return wd = $this.getWorkingDirectory();
      });
      if (wd[fileName] != null) {
        delete wd[fileName];
        return null;
      } else {
        return `rm: ${rmPath}: No such file or directory`;
      }
    }

    catCommand(path) {
      var file;
      path = path[0];
      file = this.getFile(path);
      if ((file != null) && file !== "") {
        return file;
      } else if (file === "") {
        return " ";
      } else {
        return `cat: ${path}: No such file`;
      }
    }

    headCommand(path) {
      var file;
      path = path[0];
      file = this.getFile(path);
      if ((file != null) && file !== "") {
        return file.split("\n").slice(0, 4).join("\n");
      } else if (file === "") {
        return " ";
      } else {
        return `cat: ${path}: No such file`;
      }
    }

    tailCommand(path) {
      var file, length;
      path = path[0];
      file = this.getFile(path);
      if (file && file !== "") {
        length = file.length;
        return file.split("\n").slice(-4, length).join("\n");
      } else if (file === "") {
        return " ";
      } else {
        return `cat: ${path}: No such file`;
      }
    }

    timeCommand() {
      return (new Date()).toTimeString();
    }

    exitCommand() {
      this.exit = true;
      return "[Process completed]";
    }

    historyCommand() {
      var $this, history, message;
      $this = this;
      message = "";
      history = this.history.slice(-10);
      history.forEach(function(historyItem, i) {
        return message = `${message}${history.length - i - 1} ${historyItem}\n`;
      });
      return message.replace(/\n$/, "");
    }

    
    // ------ Privet Functions -------
    getFile(path = "") {
      var $this, file, fileName;
      $this = this;
      path = path.split("/");
      fileName = path.splice(-1);
      file = "";
      path = path.join("/");
      if (path === "") {
        path = "/";
      }
      this.fromDifferntLocation(path, function() {
        return file = $this.getWorkingDirectory()[fileName];
      });
      if (typeof file !== "object") {
        return file;
      } else {
        return false;
      }
    }

    changeDirectory(destination) {
      var error, hardDrive, wd;
      // if get ~/ get from root
      if (destination === "~/") {
        wd = "";
        destination = "";
        this.workingDirectory = wd;
      } else if (/^~\//.test(destination)) {
        // wd means workingDirectory
        wd = "";
        destination = destination.replace(/^~\//, "");
      } else {
        // get relative path
        wd = this.workingDirectory.replace(/(\/$)/, "");
      }
      // if destination is current folder return
      if (destination.replace(/((^\/|\/$))/, "") === "") {
        return true;
      }
      // fix [""] glitch
      if (wd !== "") {
        wd = wd.split("/");
      } else {
        wd = [];
      }
      destination = destination.replace(/\/$/, "").split("/");
      destination.forEach(function(destination) {
        if (destination === "..") {
          return wd.splice(-1);
        } else {
          return wd.push(destination);
        }
      });
      // verify folder
      hardDrive = this.hardDrive;
      error = false;
      wd.forEach(function(cd) {
        if ((hardDrive[cd] != null) && typeof hardDrive[cd] === "object") {
          return hardDrive = hardDrive[cd];
        } else {
          error = true;
          return false;
        }
      });
      if (!error) {
        return this.workingDirectory = wd.join("/").replace(/((^\/|\/$))/, "");
      } else {
        return false;
      }
    }

    fromDifferntLocation(path = "", callback) {
      var startingDir;
      startingDir = `~/${this.workingDirectory}`;
      if (this.changeDirectory(path)) {
        callback();
        return this.changeDirectory(startingDir);
      } else {
        return false;
      }
    }

    getWorkingDirectory() {
      var hardDrive, wd;
      wd = this.workingDirectory;
      hardDrive = this.hardDrive;
      if (wd !== "") {
        wd = wd.split("/");
        wd.forEach(function(cd) {
          return hardDrive = hardDrive[cd];
        });
      }
      return hardDrive;
    }

  };

  $(document).ready(function() {
    var dateTime, terminal;
    dateTime = (new Date()).toLocaleDateString('se');
    return terminal = new Terminal({
      prefix: "[guest@luciaormaechea.com ~]$ ",
      greeting: "\t\t                    😎   WELCOME TO MY FAKE WEB TERMINAL!  🤠            \n\t\t       ,---------------------------------------------------------------.\n\t\t       |      Here you will find a little more info about myself ;)    |\n\t\t       |---------------------------------------------------------------|\n\t\t       |      Type 'help' and press ↵ Enter – A list of all the        |\n\t\t       |               available commands will be displayed.           |\n\t\t       `---------------------------------------------------------------'\n",
      selector: $(".terminal-input"),
      hardDrive: {
        "lormaechea": {
           "Skills": {
			   "languages.txt": "\n\tSpanish\t██████████████████████████████████████████████████| Native\n\tEnglish\t███████████████████████████████████████████████|||| Fluent\n\tFrench\t███████████████████████████████████████████████|||| Fluent\n\tItalian\t█████████████|||||||||||||||||||||||||||||||||||||| Notions\n",
				"operating_systems.txt": "\n\t             ,-----------------,            ,---------,\n\t        ,------------------------,        ,\"        ,\"|\n\t      ,\"                       ,\"|      ,\"        ,\"  |\n\t     +------------------------+  |    ,\"        ,\"    |\n\t     |  .---------+--------.  |  |   +---------+      |\n\t     |  |         |        |  |  |   | -==----'|      |\n\t     |  | Windows | Debian |  |  |   |         |      |\n\t     |  |---------+--------|  |  |   |`---=    |      |\n\t     |  |  Ubuntu | Linux  |  |  |   |==== ooo |      ;\n\t     |  |         |  Mint  |  |  |   |(((( [33]|    ,\"\n\t     |  `---------+--------'  |,\"    |((((     |  ,\"\n\t     +------------------------+      |         |,\"     \n\t        /_)______________(_/         +---------+\n\t   _______________________________    \n\t  /  oooooooooooooooo  .o.  oooo /,   \n\t / ==ooooooooooooooo==.o.  ooo= //  \n\t/_==__==========__==_ooo__ooo=_/'   \n\t`-----------------------------'\n\t",
				"programming_skills.txt": "\n\tBash\t█████████████████████████████████████████████||||||\n\tPerl\t█████████████████████████████████████████████||||||\n\tPython\t█████████████████████████████████████████████||||||\n\tXML\t██████████████████████████████████████████|||||||||\n\tHTML\t██████████████████████████████████████████|||||||||\n\tPraat\t███████████████████████████████████████||||||||||||\n\tSQL\t███████████████████████████████████||||||||||||||||\n\tC++\t███████████████████████████||||||||||||||||||||||||\n\tJava\t███████████████████████||||||||||||||||||||||||||||\n",
				"tools.txt": "\n        ________                       ________\n       |        |    Adobe            |        |\n       |   Ps   |    Photoshop        |   D.   |   Docker\n       |________|                     |________| \n   \n                                              \n     #######              VVV   VVV           ||  /\n    ##                    VVV  VVV            || /\n   ##            Git      VVV VVV     Vim     ||/      Kaldi\n   ##    #####            VVVVV               ||\\\n    ##     ##             VVVV                || \\\n     #######              VVV                 ||  \\\n	 \n",
			},
			"About": {
			   "visiting_card.txt": "\n\t,-----------------------------------------------------------------------.\n\t|‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾|                                                    * |\n\t|     ********    |                    Lucía ORMAECHEA GRIJALBA          |\n\t|   ***********   |                    --------------------------------- |\n\t|  *************  |                    Ph.D. Candidate & NLP Researcher  |\n\t|  *************  |                    Dpt. Translation Technology       |\n\t|   ***********   |                    University of Geneva              |\n\t|     ********    |                                                      |\n\t|    **********   |      Email: Lucia.OrmaecheaGrijalba@unige.ch         |\n\t|   ************  |      Phone: +41 22 37 98684                          |\n\t|  ************** |      Website: https://luciaormaechea.com/            |\n\t|_________________|                                                    * |\n\t\'------------------------------------------------------------------------\'\n",
			},
          // "Movies": {},
          // "Music": {
            // "iTunes": {
              // "Album Artwork": {},
              // "iTunes Media": {
                // "Music": {},
                // "Movies": {}
              // }
            // }
          // },
          // "Pictures": {
          // }
        },
        // "Applications": {},
        // "System": {}
      },
      workingDirectory: "lormaechea"
    });
  });

}).call(this);


//# sourceURL=coffeescript
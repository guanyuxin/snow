
const translate = require('google-translate-api');
const Excel = require('exceljs');
const fs = require('fs')
const {ipcRenderer} = require('electron')

ipcRenderer.on('updateInfo', (event, message) => {
	$('.v').text(message)
})


window.ondragover = (e) => {
	for (let f of e.dataTransfer.files) {
		if (f.name.indexOf('.xlsx') !== -1 && f.name.indexOf('_翻译') === -1) {
			appManager.addFile(f.path, true)
		}
	}
	return false;
}
window.ondragleave = window.ondragend = (e) => {
	if (e.clientX !== 0) {
		return;
	}
	for (let f of e.dataTransfer.files) {
		appManager.removeFile(f.path, true)
	}
	return false;
}
window.ondrop = (e) => {
	e.preventDefault()
	for (let f of e.dataTransfer.files) {
		if (f.name.indexOf('.xlsx') !== -1 && f.name.indexOf('_翻译') === -1) {
			appManager.confirmFile(f.path);
			localStorage.path = f.path;
		} else {
			alert(f.path + "不是excel文件");
		}
	}
	return false;
}
var appManager = {
	files: {},
	srcPanel: $('.src'),
	destPanel: $('.dest'),
	addFile: function (path) {
		if (this.files[path]) {
			return;
		}
		var f = new FileData(path);
		f.load(path);
		this.files[path] = f;

		this.srcPanel.append(f.icon)
	},
	confirmFile: function (path) {
		if (!this.files[path] || this.files[path].confirmd) {
			return;
		}
		this.files[path].comfirming();

		this.destPanel.append(this.files[path].destIcon)
	},
	removeFile: function (path) {
		if (this.files[path] && !this.files[path].confirmd) {
			this.files[path].icon.remove();
			this.files[path] = undefined;
		}
	},
	createIcon: function (name, draggable) {
		return $(`<div class="icon"><img draggable="false" src="img/xls.png"/><div class="nameTag">${name}</div></div>`)
	}
}

function t(data, callback, callbackErr) {
	//setTimeout(function() {callback('123')},Math.random()*1000 + 200);
	//return;
	translate(data, {from: 'zh-cn', to: 'ja'}).then(res => {
		callback(res.text);
	}).catch((e) => {
		callbackErr(e);
	})
}


var FileData = function (path) {
	this.workbook = new Excel.Workbook();
	this.worksheets = null;
	this.path = path;
	this.name = this.path.split(/[\\./]/);
	this.name = this.name[this.name.length - 2];
	this.destName = this.name + '_翻译';
	this.pathDest = this.path.replace('.xlsx', '_翻译.xlsx');

	this.icon = appManager.createIcon(this.name);

	this.pmax = 0;
	this.psucc = 0;
	this.perr = 0;
}

FileData.prototype.comfirming = function () {
	this.confirmd = true;
	this.icon.addClass('confirmd');

	this.destIcon = appManager.createIcon(this.destName);
	this.$progress = $(`<div class="progressBar">
      <div class="succ"></div>
      <div class="err"></div>
      <div class="progresst"></div>
    </div>`)
    this.destIcon.append(this.$progress);
    this.$succ = this.$progress.find('.succ');
    this.$err = this.$progress.find('.err');
    this.$progresst = this.$progress.find('.progresst');

	if (this.worksheets) {
		this.translate();
	} else {
		this.onload = () => {
			this.translate();
		}
	}
}

FileData.prototype.load = function () {
	this.workbook.xlsx.readFile(this.path).then(() => {
		this.worksheets = this.workbook.worksheets[0];
		this.onload && this.onload();
	});
}
FileData.prototype.succ = function () {
	this.psucc++;
	if (this.psucc + this.perr >= this.pmax) {
		this.end();
	}
	this.progress();
	
	console.log(this.psucc,this.pmax)
	this.$succ.css('width', 100*this.psucc/this.pmax + '%');
}

FileData.prototype.err = function () {
	this.perr++;
	if (this.psucc + this.perr >= this.pmax) {
		this.end();
	}
	this.progress();
	this.$err.css('width', 100*this.perr/this.pmax + '%');
	this.$progresst.text("失败：" + this.perr);
}
FileData.prototype.progress = function () {
	this.onProgress && this.onProgress();

}
FileData.prototype.end = function () {
	this.onEnd && this.onEnd();
	this.write();
}
FileData.prototype.write = function () {
	this.workbook.xlsx.writeFile(this.pathDest).then(() => {
		this.destIcon.addClass('confirmd');
		this.destIcon.attr('draggable', 'true');
		this.destIcon[0].addEventListener("dragstart", (e) => {
			e.dataTransfer.effectAllowed = 'copy'
			e.preventDefault()
			ipcRenderer.send('ondragstart', this.pathDest);
		},false);
	});
}
FileData.prototype.translate = function () {
	this.worksheets.eachRow((row, i) => {
		if (i == 1) {return}
			
		try {
			if (!row.getCell(4)) {
				console.log(row);
				return;
			}
			this.pmax += 2;

			if (row.getCell(2).text) {
				this.pmax++;
				t(row.getCell(8).text, (msg) => {
					row.getCell(9).value = msg;
					this.succ(i, 7);
				}, (e) => {
					this.err(i, 5);
				})
			}
			t(row.getCell(4).text, (msg) => {
				row.getCell(5).value = msg;
				this.succ(i, 3);
			}, (e) => {
				this.err(i, 3);
			})
			t(row.getCell(6).text, (msg) => {
				row.getCell(7).value = msg;
				this.succ(i, 5);
			}, (e) => {
				this.err(i, 5);
			})
			
		} catch (err) {
			console.error(err);
			console.error(i, row);
		};
	})
}


if (localStorage.path) {
	setTimeout(function () {
	//	appManager.addFile(localStorage.path);
	//	appManager.confirmFile(localStorage.path);
	})
}

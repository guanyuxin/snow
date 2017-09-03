// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const {ipcRenderer} = require('electron')
const fs = require('fs')
const translate = require('google-translate-api');
const holder = document.getElementById('holder')
const body = document.body;
var Excel = require('exceljs');
var workbook = new Excel.Workbook();
var worksheets;

window.ondragover = () => {
	console.log('fover');
	holder.classList.add('dragover');
	return false;
}
holder.ondragleave = holder.ondragend = () => {
	console.log('leave')
	holder.classList.remove('dragover');
	return false;
}

function addImage(p) {
	var ext = p.split('.');
	ext = ext[ext.length - 1];
	if (ext === "jpg") {
		ext = 'jpeg';
	}
	var imageId1 = workbook.addImage({
	  filename: p,
	  extension: ext,
	});
	worksheets.addImage(imageId1, 'J2:J2');
	end();
}

window.ondrop = (e) => {
	e.preventDefault()
	holder.classList.remove('dragover');
	for (let f of e.dataTransfer.files) {
		console.log('File(s) you dragged here: ', f.path)

		if (f.name.indexOf('.xlsx') !== -1) {
			readFile(f.path);
			localStorage.path = f.path;
		} else {
			addImage(f.path);
		}
	}
	
	return false;
}

var pmax = 0;
var psucc = 0;
var perr = 0;
var errors = [];
var $succ = $('.succ');
var $err = $('.err');
var $progress = $('.progresst')
var data;
var fname;

function end() {
	renderData(worksheets);
	workbook.xlsx.writeFile(fname.replace('.xlsx', '_f2.xlsx')).then(function() {
		console.log('done')
	});
}


function succ () {
	psucc++;
	$succ.css('width', 100*psucc/pmax + '%');
	$progress.text('成功:' + psucc + "，失败：" + perr + '----总共：' + pmax);
	if (psucc + perr >= pmax) {
		end();
	}
}
function err () {
	perr++;
	$err.css('width', 100*perr/pmax + '%');
	$progress.text('成功:' + psucc + "，失败：" + perr + '----总共：' + pmax);
	if (psucc + perr >= pmax) {
		end();
	}
}

function t(data, callback, callbackErr) {
	translate(data, {from: 'zh-cn', to: 'ja'}).then(res => {
		callback(res.text);
	}).catch((e) => {
		callbackErr(e);
	})
}

function readFile(f) {

	fname = f;
	document.title= f;
	document.getElementById('table').innerHTML = "加载文件：" + f;
	workbook.xlsx.readFile(f).then(function() {
		worksheets = workbook.worksheets[0];

		worksheets.eachRow((row, i) => {
			if (i == 1) {return}
				
			try {
				if (!row.getCell(4)) {
					console.log(row);
					return;
				}
				pmax += 2;

				if (row.getCell(2).text) {
					pmax++;
					t(row.getCell(8).text, (msg) => {
						row.getCell(9).value = msg;
						succ(i, 7);
					}, (e) => {
						err(i, 5);
					})
				}
				t(row.getCell(4).text, (msg) => {
					row.getCell(5).value = msg;
					succ(i, 3);
				}, (e) => {
					err(i, 3);
				})
				t(row.getCell(6).text, (msg) => {
					row.getCell(7).value = msg;
					succ(i, 5);
				}, (e) => {
					err(i, 5);
				})
				
			} catch (err) {
				console.error(err);
				console.error(i, row);
			};
		})
		renderData(worksheets);
	});
}


function renderData(worksheets) {
	var html = '';
	worksheets.eachRow(function (row, i) {
		if (i > 20) {return false}
		if (i == 1) {
			html += '<div class="row head">';
			w = row.cellLength;
		} else {
			html += '<div class="row" id="row-' + i + '">';
		}

		for (var j = 1; j < 11; j++) {
			if (j == 10) {
				html += '<div class="cell">添加图片</div>'
			} else {
				html += '<div class="cell">' + (row.getCell(j).text) + '</div>'
			}
		}
		html += '</div>'
	});
	document.getElementById('table').innerHTML = html;
}

if (localStorage.path) {
	readFile(localStorage.path);
}
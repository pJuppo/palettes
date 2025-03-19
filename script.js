function changeCharacter()
{
	palette.character = elements.character.value;
	allPalettes = paletteFile[palette.character];
	paletteColor.index = 0;
	updatePalette(true);
	changePaletteVariant(true);
	elements.paletteName.selectedIndex = 0;
	elements.paletteWhichColor.innerHTML = "";
	let option;
	colorNames[palette.character].forEach((value, index) => {
		option = document.createElement("option");
		option.value = index;
		option.label = value;
		elements.paletteWhichColor.options.add(option);
	})
	elements.paletteWhichColor.selectedIndex = paletteColor.index;
	changePaletteWhichColor();
}

function changePaletteVariant(doUpdateColor)
{
	palette.variant = elements.paletteVariant.checked * 1;
	if (doUpdateColor) {
		updateColor();
	}
}

function changeEditAll()
{
	editAll = elements.editAll.checked;
}

function changePaletteWhichColor()
{
	paletteColor.name = elements.paletteWhichColor.value;
	paletteColor.index = elements.paletteWhichColor.selectedIndex;
	updateColor();
}

function loadImages()
{
	imageStructs.forEach((struct) => {
		let image = new Image();
		let loadFunction = function() {
			this.onload = null;
			
			if (this.imageName == "pattern") {
				pattern = context.createPattern(this, "repeat");
				return;
			}
			
			const imageCanvas = document.createElement("canvas");
			imageCanvas.width = this.width;
			imageCanvas.height = this.height;
			const imageContext = imageCanvas.getContext("2d");

			var colors = (this.imageName == "buster") ? defaultColors.buster : defaultColors.bom;

			const masks = [];
			for (let i = 0; i < colors.length; i++) {
				masks[i] = imageContext.createImageData(imageCanvas.width, imageCanvas.height)
			}
			const rest = imageContext.createImageData(imageCanvas.width, imageCanvas.height);

			imageContext.drawImage(this, 0, 0);
			const imageData = imageContext.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
			let data = imageData.data;

			let matchIndex, currentColor;
			let currentMask;
			for (let i = 0; i < data.length; i += 4) {
				let r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
				if ((r == 1 && g == 255 && a == 255) && (b == 0 || b == 255)) {
					r = 0;
				}

				currentColor = rgbaToHex(r, g, b, a)
				matchIndex = colors.findIndex(function (color) {
					return (color == currentColor);
				});
				currentMask = (matchIndex != -1) ? masks[matchIndex] : rest;
				currentMask.data[i] = r;
				currentMask.data[i + 1] = g;
				currentMask.data[i + 2] = b;
				currentMask.data[i + 3] = a;
			}

			let maskImages = [], maskImage;
			masks.forEach((mask) => {
				imageContext.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
				imageContext.putImageData(mask, 0, 0);
				maskImage = new Image();
				maskImage.src = imageCanvas.toDataURL();
				maskImages.push(maskImage);
			})
			imageContext.putImageData(rest, 0, 0);
			let restImage = new Image();
			restImage.src = imageCanvas.toDataURL();

			images[this.imageName] = {
				masks: maskImages,
				rest: restImage,
			}

			imageCanvas.remove();
		};
		loadFunction.bind(image);
		image.onload = loadFunction;
		image.imageName = struct.name;
		image.src = "Images/" + struct.path;
	});
}

function loadJSON()
{
	if (elements.file.files.length == 0) {
		alert("Please select a file first.")
		return;
	}
	if (fileLoaded) {
		if (!confirm("Overwrite the current file?")) {
			return;
		}
	}
	const file = elements.file.files[0];
	const reader = new FileReader();
	reader.onload = () => {
		try {
			paletteFile = JSON.parse(reader.result);
		} catch (error) {
			alert("There was an error loading the JSON file:\n" + error.name + ": " + error.message);
			return;
		}
		elements.fileName.value = file.name;
		onSuccessfulLoad();
		changeCharacter();
	}
	reader.readAsText(file);
}

function exportJSON()
{
	if (!fileLoaded) {
		alert("Please load a file first.");
		return;
	}
	const json = JSON.stringify(paletteFile);
	const blob = new Blob([json], {type: "application/json"});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	let fileName = elements.fileName.value;
	if (fileName == "") {
		fileName = "custom_palettes";
	}
	link.download = fileName;
	link.click();
	URL.revokeObjectURL(url);
}

function newFile()
{
	if (fileLoaded) {
		if (!confirm("Overwrite the current file?")) {
			return;
		}
	}
	paletteFile = structuredClone(defaultPalettes);
	onSuccessfulLoad();
	changeCharacter();
	elements.fileName.value = "";
}

function onSuccessfulLoad()
{
	if (!fileLoaded)
		requestRefresh();
	fileLoaded = true;
	sections.edit.style.display = "block";
}

function changePaletteName()
{
	palette.name = elements.paletteName.value;
	updatePalette();
	updateColor();
}

function changeColor() {
	let color = hexToRgb(elements.color.value);
	let alpha = Math.round(parseInt(elements.alpha.value));
	color.push(alpha);
	for (let i = 0; i < palette.id.variants.length; i++) {
		if (i == palette.variant || editAll) {
			getCurrentPalette(i)[paletteColor.index] = color;
		}
	}
}

function updateColor() {
	console.log(paletteColor);
	let color = structuredClone(getCurrentPalette(palette.variant)[paletteColor.index]);
	let alpha = color[3];
	color.splice(3, 1);
	let hex = rgbaToHex(...color);
	hex = "#" + hex;
	elements.color.value = hex;
	elements.alpha.value = alpha.toString();
}

function updatePalette(startFromZero, initialValueType)
{
	if (!fileLoaded) {
		return;
	}
	flashIndex = 1;
	let paletteGroup = paletteFile[palette.character];
	if (startFromZero) {
		palette.index = 0;
		palette.id = paletteGroup[0];
		palette.name = palette.id.name;
	} else {
		if (initialValueType == "index") {
			palette.id = paletteGroup[palette.index];
			palette.name = palette.id.name;
		} else {
			palette.index = paletteGroup.findIndex(value => palette.name == value.name);
			palette.id = paletteGroup[palette.index];
		}
	}

	elements.paletteName.innerHTML = "";;
	let option;
	paletteGroup.forEach(value => {
		option = document.createElement("option");
		option.value = value.name;
		option.label = value.name;
		elements.paletteName.options.add(option);
	})
	elements.paletteName.selectedIndex = palette.index;
}

function deletePalette() {
	if (allPalettes.length < 2) {
		alert("Sorry partner, you can't delete the last one.")
		return;
	}
	if (!confirm("Really delete this palette?")) {
		return;
	}
	allPalettes.splice(palette.index, 1);
	if (palette.index > 0) {
		palette.index--;
	}
	updatePalette(false, "index");
}

function addPalette() {
	let newName = prompt("Name the copied palette.", "")
	if (newName == null) {
		return;
	}
	let paletteNames = allPalettes.map(thisPalette => {
		return thisPalette.name;
	})
	if (paletteNames.includes(newName)) {
		alert("Sorry partner, that palette already exists.")
		return;
	}
	pal = structuredClone(allPalettes[palette.index]);
	pal.name = newName;
	allPalettes.push(pal)
	palette.index = allPalettes.length - 1;
	updatePalette(false, "index");
	elements.paletteName.selectedIndex = elements.paletteName.options.length - 1;
	changePaletteName();
}

function rgbaToHex(r, g, b, a)
{
	let hex = ((r << 16) + (g << 8) + b).toString(16).padStart(6, "0");
	if (a || a == 0) {
		return hex + a.toString(16).padStart(2, "0");
	} else {
		return hex;
	}
}

function hexToRgb(hex) {
	hex = hex.replace("#", "");

	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 8), 16);

	return [r, g, b];
}

function rgbaFillStyle(drawingContext, r, g, b, a)
{
	drawingContext.fillStyle = "rgb(" + r + " " + g + " " + b + ")";
	drawingContext.globalAlpha = a / 255;
}

function chooseRandom(...items)
{
	if (items.length == 0) {
		return undefined;
	}
	let index = Math.floor(Math.random() * items.length);
	return items[index];
}

function loadFiles() {
	let fetchProgress = 0;
	fetchFiles.forEach(fileStruct => {
		fetch(fileStruct.file)
			.then(response => {
				if (!response.ok) {
					fetchProgress++;
					return;
				}
				response.json()
					.then(data => {
						fetchResults[fileStruct.name] = data;
						fetchProgress++;
					});
			})	
	})
	return new Promise(resolve => {
		const spinFunction = () => {
			if (!(fetchProgress < fetchFiles.length)) {
				resolve();
			} else {
				setTimeout(spinFunction, 100);
			}
		}
		spinFunction();
	});
}

function drawImage(name, drawPalette)
{
	let tempCanvas = document.createElement("canvas");
	images[name].masks.forEach(function(mask, index) {
		tempCanvas.width = mask.width;
		tempCanvas.height = mask.height;
		let tempContext = tempCanvas.getContext("2d");
		tempContext.drawImage(mask, 0, 0);
		tempContext.globalCompositeOperation = "source-in";
		rgbaFillStyle(tempContext, ...drawPalette[index]);
		tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
		context.drawImage(tempCanvas, 0, 0);
	})
	tempCanvas.remove();
	context.drawImage(images[name].rest, 0, 0);
}

function getCurrentPalette(variant)
{
	return palette.id.variants[variant];
}

function requestRefresh()
{
	requestAnimationFrame(refresh);
}

function refresh(timestamp)
{
	if (lastTimestamp != null) {
		deltaTime = (timestamp - lastTimestamp) / 1000;
	}
	lastTimestamp = timestamp;
	
	context.fillStyle = "#bfbfbf";
	context.globalAlpha = 1
	context.fillRect(0, 0, canvas.width, canvas.height);
	
	pattern.setTransform(transformMatrix);
	patternTransform = 20 * deltaTime;
	transformMatrix = transformMatrix.translateSelf(patternTransform, patternTransform);

	flashIndex += 20 * deltaTime;
	flashIndex %= 2;
	
	context.fillStyle = pattern;
	context.fillRect(0, 0, canvas.width, canvas.height);
	
	if (fileLoaded) {
		let variantZero = getCurrentPalette(0);
		let variantOne = getCurrentPalette(1);
		let variantCurrent = getCurrentPalette(palette.variant);
		let canvasDivision = canvas.width / variantCurrent.length;
		context.fillStyle = "#bfbfbf";
		context.fillRect(0, 0, canvas.width, 30);
		variantCurrent.forEach((color, index) => {
			rgbaFillStyle(context, ...color);
			context.fillRect(index * canvasDivision + 2, 2, canvasDivision - 4, 26);
		})
		context.globalAlpha = 1;
		if (palette.character == "buster") {
			if (variantCurrent) {
				drawImage("buster", variantCurrent);
			}
		} else {
			let bomImage = "bom";
			if (palette.variant == 1) {
				bomImage = "bom edge";
			}
			if (variantZero && variantOne) {
				drawImage(bomImage, ((palette.variant > 0 && (Math.floor(flashIndex) == 1)) ? variantOne : variantZero));
				drawImage("pipe", variantZero);
			}
		}
	}
	
	requestRefresh();
}

const fetchFiles = [
	{
		"file": "defaultPalettes.json",
		"name": "defaultPalettes",
	},
	{
		"file": "defaultColors.json",
		"name": "defaultColors",
	},
	{
		"file": "images.json",
		"name": "imageStructs",
	},
	{
		"file": "colorNames.json",
		"name": "colorNames",
	}
]
const fetchResults = {};

const sections = {
	content: document.getElementById("sectionContent"),
	edit: document.getElementById("sectionEdit"),
}
const elements = {
	file: document.getElementById("inputFile"),
	fileName: document.getElementById("inputFileName"),
	character: document.getElementById("inputCharacter"),
	paletteVariant: document.getElementById("inputPaletteVariant"),
	paletteName: document.getElementById("inputPaletteName"),
	paletteWhichColor: document.getElementById("inputPaletteWhichColor"),
	color: document.getElementById("inputColor"),
	alpha: document.getElementById("inputAlpha"),
	editAll: document.getElementById("inputEditAll"),
}

var paletteFile = null;
var allPalettes = null;
var palette = {};
var paletteColor = {};
var editAll = false;
changeEditAll();

const canvas = document.getElementById("preview");
const context = canvas.getContext("2d");
context.imageSmoothingEnabled = false;

var fileLoaded = false;
var defaultColors, defaultPalettes, imageStructs, colorNames;
var pattern = null;

const images = {};

var lastTimestamp = null;
var deltaTime = 0;
var patternTransform, flashIndex;
var transformMatrix = new DOMMatrix([1, 0, 0, 1, 0, 0]);

loadFiles()
	.then(() => {
		context.fillStyle = "#bfbfbf";
		context.fillRect(0, 0, canvas.width, canvas.height);
		defaultColors = fetchResults.defaultColors;
		defaultPalettes = fetchResults.defaultPalettes;
		imageStructs = fetchResults.imageStructs;
		colorNames = fetchResults.colorNames;
		loadImages();
		sections.content.style.display = "block";
	})
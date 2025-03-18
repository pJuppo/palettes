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

function changeCharacter()
{
	let character = characterDropdown.value;
	paletteCharacter = character;
	paletteMode = 0;
	flashIndex = 1;
}

function swapPaletteMode()
{
	if (!fileLoaded) {
		return;
	}
	paletteMode = 1 - paletteMode;
	flashIndex = 1;
}

function onSuccessfulLoad()
{
	fileLoaded = true;
	requestRefresh();
}

function newFile()
{
	if (fileLoaded) {
		if (!confirm("Overwrite the current file?")) {
			return;
		}
	}
	resetPalettes();
	onSuccessfulLoad();
	requestRefresh();
}

function resetPalettes()
{
	palettes = fetchResults.defaultPalettes;
}

function rgbaToHex(r, g, b, a)
{
	return ((r << 16) + (g << 8) + b).toString(16).padStart(6, "0") + a.toString(16).padStart(2, "0");
}

function rgbaFillStyle(drawingContext, r, g, b, a)
{
	drawingContext.fillStyle = "rgb(" + r + " " + g + " " + b + ")";
	drawingContext.globalAlpha = a / 255;
}

function loadJSON()
{
	if (input.files.length == 0) {
		alert("Please select a file first.")
		return;
	}
	if (fileLoaded) {
		if (!confirm("Overwrite the current file?")) {
			return;
		}
	}
	const file = input.files[0];
	const reader = new FileReader();
	reader.onload = () => {
		try {
		palettes = JSON.parse(reader.result);
		onSuccessfulLoad();
		} catch (error) {
		alert("There was an error loading the JSON file:\n" + error.name + ": " + error.message);
		}
	}
	reader.readAsText(file);
}

function exportJSON()
{
	if (!fileLoaded) {
		alert("Please load a file first.");
		return;
	}
	const json = JSON.stringify(palettes, null, "	");
	const blob = new Blob([json], {type: "application/json"});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = "custom_palettes.json";
	link.click();
	URL.revokeObjectURL(url);
}

function chooseRandom(...items)
{
	if (items.length == 0) {
		return undefined;
	}
	let index = Math.floor(Math.random() * items.length);
	return items[index];
}

function loadImages()
{
	imageStructs.forEach((struct) => {
		let image = new Image();
		let loadFunction = function() {
			this.onload = null;
			
			if (this.name == "pattern") {
				pattern = context.createPattern(this, "repeat");
				previewReady++;
				return;
			}
			
			const imageCanvas = document.createElement("canvas");
			imageCanvas.width = this.width;
			imageCanvas.height = this.height;
			const imageContext = imageCanvas.getContext("2d");

			var colors = (this.name == "buster") ? defaultColors.buster : defaultColors.bom;

			const masks = [];
			for (let i = 0; i < colors.length; i++) {
				masks[i] = imageContext.createImageData(imageCanvas.width, imageCanvas.height)
			}
			const rest = imageContext.createImageData(imageCanvas.width, imageCanvas.height);

			imageContext.drawImage(this, 0, 0);
			imageContext.globalCompositeOperation = "source-over";
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

			images[this.name] = {
				masks: maskImages,
				rest: restImage,
			}

			imageCanvas.remove();

			previewReady++;
		};
		loadFunction.bind(image);
		image.onload = loadFunction;
		image.name = struct.name;
		image.src = "Images/" + struct.path;
	});
}
	
function requestRefresh()
{
	requestAnimationFrame(refresh);
}

function drawImage(name, palette)
{
	let tempCanvas = document.createElement("canvas");
	images[name].masks.forEach(function(mask, index) {
		tempCanvas.width = mask.width;
		tempCanvas.height = mask.height;
		let tempContext = tempCanvas.getContext("2d");
		tempContext.drawImage(mask, 0, 0);
		tempContext.globalCompositeOperation = "source-in";
		rgbaFillStyle(tempContext, ...palette[index]);
		tempContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
		context.drawImage(tempCanvas, 0, 0);
	})
	tempCanvas.remove();
	context.drawImage(images[name].rest, 0, 0);
}

function refresh(timestamp)
{
	if (lastTimestamp != null) {
		deltaTime = (timestamp - lastTimestamp) / 1000;
	}
	lastTimestamp = timestamp;
	
	if (previewReady < imageStructs.length) {
		requestRefresh();
		return;
	}
	
	context.fillStyle = "#bfbfbf";
	context.fillRect(0, 0, canvas.width, canvas.height);
	
	patternTransform = 20 * deltaTime;
	transformMatrix = transformMatrix.translateSelf(patternTransform, patternTransform);
	
	pattern.setTransform(transformMatrix);

	flashIndex += 20 * deltaTime;
	flashIndex %= 2;
	
	context.fillStyle = pattern;
	context.fillRect(0, 0, canvas.width, canvas.height);
	
	if (fileLoaded) {
		let paletteNum = 0;
		if (paletteCharacter == "buster") {
			drawImage("buster", palettes.buster[paletteNum + paletteMode].colors);
		} else {
			let bomImage = "bom";
			if (paletteMode > 0) {
				bomImage = "bom edge";
			}
			drawImage(bomImage, palettes.bom[paletteNum + (paletteMode * Math.floor(flashIndex))].colors);
			drawImage("pipe", palettes.bom[paletteNum].colors);
		
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
	}
]
const fetchResults = {};

const content = document.getElementById("content");
content.style.display = "none";

const fileInput = document.getElementById("input");
const characterDropdown = document.getElementById("characterDropdown");
const canvas = document.getElementById("preview");
const context = canvas.getContext("2d");

var palettes;
changeCharacter();

var fileLoaded = false;
var defaultColors, defaultPalettes;
var pattern = null;

var previewReady = 0;

const images = {};
const imageStructs = [
	{
		"name": "buster",
		"path": "buster.png",
		"type": 0,
	},
	{
		"name": "bom",
		"path": "bom.png",
		"type": 0,
	},
	{
		"name": "bom edge",
		"path": "bom edge.png",
		"type": 0,
	},
	{
		"name": "pattern",
		"path": "pattern.png",
		"type": 1,
	},
	{
		"name": "pipe",
		"path": "pipe.png",
		"type": 0,
	},
];
const colorNames = {
	"buster": [
		"White",
		"Outline",
		"Gloves",
		"Pants",
		"Skin",
		"Nose",
		"Nose Outline",
		"Spark",
		"Spark Outline",
	],
	"bom": [
		"White",
		"Outline",
		"Spark Outline",
		"Color Dark",
		"Color",
		"Color Light",
		"Eyes",
		"Top",
	],
}

var lastTimestamp = null;
var deltaTime = 0;
var patternTransform, flashIndex;
var transformMatrix = new DOMMatrix([1, 0, 0, 1, 0, 0]);

resetPalettes();
loadFiles()
	.then(() => {
		context.fillStyle = "#bfbfbf";
		context.fillRect(0, 0, canvas.width, canvas.height);
		defaultColors = fetchResults.defaultColors;
		defaultPalettes = fetchResults.defaultPalettes;
		loadImages();
		content.style.display = "block";
	})


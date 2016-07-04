/*global document, signature, sources */

var signature = (function(){
	'use strict';
	var normaliserCanvas = document.querySelector('#normaliser'),
		nCtx = normaliserCanvas.getContext('2d');
	
	var analyserCanvas = document.querySelector('#analyser'),
		aCtx = analyserCanvas.getContext('2d');

	console.log('Analyser initialised');

	// var signatures = [];
	// var normalisedData = [];

	var signatures = [];

	for(var x = 0; x < sources.length; x += 1){

		var i = new Image();
		i.setAttribute('data-id', x);
		i.onload = function(){
			document.body.appendChild(this);

			var sig = {
				id : this.getAttribute('data-id'),
				image : this,
				normalisedImage : new Image(),
				counts : undefined,
				scaledCounts : undefined,
				dataPoints : [],
				peaks : 0,
				signatureImage : new Image(),
				isLike : []
			}

			signatures.push(sig);

			if(signatures.length == sources.length){
				console.log('Lets\' do something!');
				normalise();
			}

		};
		i.setAttribute('hidden', 'true');
		i.src = sources[x];

		console.log(sources[x]);

	}

	function normalise(){
		console.log('Normalise');

		for(var z = 0; z < signatures.length; z += 1){

			var thisSource = signatures[z].image;

			normaliserCanvas.width = thisSource.width;
			normaliserCanvas.height = thisSource.height;
			nCtx.drawImage(thisSource, 0, 0);

			var pixelData = nCtx.getImageData(0,0,normaliserCanvas.width, normaliserCanvas.height);
			var d = pixelData.data;

			var t = normaliserCanvas.height;
			var l = normaliserCanvas.width;
			var r = 0;
			var b = 0;
			
			var counts = new Array(normaliserCanvas.width);
			
			for(var c = 0; c < counts.length; c += 1){
				counts[c] = 0;
			}

			for(var yy = 0; yy < d.length; yy += 4){
				
				var x = (yy / 4) % normaliserCanvas.width;
				var y = ( (yy / 4) / normaliserCanvas.width) | 0;
				
				var g = parseInt((d[yy] + d[yy + 1] + d[yy + 2]) / 3);

				if(g < 128){
					g = 0;
					
					if(x < l){
						l = x
					}

					if(x > r){
						r = x;
					}

					if(y < t){
						t = y;
					}

					if(y > b){
						b = y;
					}

					counts[x] += 1;

				} else {
					g = 255;
				}
	
				d[yy] = d[yy + 1] = d[yy + 2] = g;

			}

			nCtx.putImageData(pixelData, 0, 0);

			/*nCtx.beginPath();
			// Left
			nCtx.strokeStyle = "red";
			nCtx.moveTo(l, 0);
			nCtx.lineTo(l, normaliserCanvas.height);
			nCtx.stroke();
			nCtx.closePath;

			// Right
			nCtx.beginPath();
			nCtx.strokeStyle = "green";
			nCtx.moveTo(r, 0);
			nCtx.lineTo(r, normaliserCanvas.height);
			nCtx.stroke();

			// Top
			nCtx.beginPath();
			nCtx.strokeStyle = "blue";
			nCtx.moveTo(0, t);
			nCtx.lineTo(normaliserCanvas.width, t);
			nCtx.stroke();

			// Bottom
			nCtx.beginPath();
			nCtx.strokeStyle = "orange";
			nCtx.moveTo(0, b);
			nCtx.lineTo(normaliserCanvas.width, b);
			nCtx.stroke();

			nCtx.closePath();*/

			// counts.splice(normaliserCanvas.width - r, r);
			// counts.splice(l, 0);

			console.log(l, r, b, t);

			counts.splice(r, normaliserCanvas.width - r);
			counts.splice(0, l);

			signatures[z].counts = counts;

			var cropped = nCtx.getImageData(l, t, l + r-l, t + b - t);
			normaliserCanvas.width = r - l;
			normaliserCanvas.height = b - t;

			nCtx.putImageData(cropped, 0, 0);

			signatures[z].normalisedImage.src = normaliserCanvas.toDataURL('image/png');
			/*
			nCtx.lineWidth = 1;

			for(var g = 0; g < counts.length; g += 1){

				nCtx.beginPath();
				nCtx.strokeStyle = "rgba(255,0,0,1)";
				nCtx.moveTo(g, 0);
				nCtx.lineTo(g, counts[g]);
				nCtx.stroke();

			}

			for(var g = 0; g < counts.length - 10; g += 1){

				nCtx.beginPath();
				nCtx.strokeStyle = "rgba(0,0,255,.3)";
				nCtx.moveTo(g, 0);
				nCtx.lineTo(g, (counts[g] + counts[g + 1] + counts[g + 2] + counts[g + 3] + counts[g + 4] + counts[g + 5] + counts[g + 6] + counts[g + 7] + counts[g + 8] + counts[g + 9]) / 10 );
				//nCtx.stroke();

			}

			console.log(counts);
			console.log(z, signatures.length);
			console.log(signatures[z])
			*/

		}

		analyseImages();

	}

	function analyseImages(){
		// aCtx.putImageData(cropped, 0, 0);
		for(var k = 0; k < signatures.length; k += 1){
			
			aCtx.clearRect(0,0,analyserCanvas.width, analyserCanvas.height);

			var thisSignature = signatures[k];

			analyserCanvas.width = thisSignature.normalisedImage.width;
			analyserCanvas.height = thisSignature.normalisedImage.height;
			
			aCtx.lineWidth = 1;

			const characterIsWiderThanItIsTall = analyserCanvas.width > analyserCanvas.height;
			const imageRatio = (analyserCanvas.width / analyserCanvas.height);
			
			console.log(analyserCanvas.width, analyserCanvas.height, imageRatio);
			
			var nW = 300;
			var nH = nW / imageRatio;

			console.log(nW, nH)

			analyserCanvas.width = nW;
			analyserCanvas.height = nH;

			aCtx.drawImage(thisSignature.normalisedImage, 0, 0, nW, nH);			

			var max = 0;
			var min = analyserCanvas.height;

			var div = thisSignature.normalisedImage.width / nW | 0;

			aCtx.beginPath();
			aCtx.strokeStyle = "rgba(255,0,0,.3)";
		
			for(var g = 0; g < thisSignature.counts.length; g += 1){
				// debugger;
				if(g % div === 0){

					// aCtx.moveTo(g / (thisSignature.normalisedImage.width / nW), 0);
					// aCtx.lineTo(g / (thisSignature.normalisedImage.width / nW), thisSignature.counts[g]);
					// aCtx.stroke();

					thisSignature.dataPoints[(g / (thisSignature.normalisedImage.width / nW)) | 0] = thisSignature.counts[g];

					if(thisSignature.counts[g] < min){
						min = thisSignature.counts[g];
					}

					if(thisSignature.counts[g] > max){
						max = thisSignature.counts[g];
					}

				}

			}

			aCtx.closePath();

			var scaleValue = nH / max;

			aCtx.fillStyle = "rgba(0,0,255,.5)";
			for(var l = 0; l < thisSignature.dataPoints.length; l += 1){

				thisSignature.dataPoints[l] = thisSignature.dataPoints[l] * scaleValue > nH / 2 ? 1 : 0;
				
				if(thisSignature.dataPoints[l - 1] !== 1 && thisSignature.dataPoints[l] === 1){
					// debugger;
					thisSignature.peaks += 1;
				}
				aCtx.fillRect(l, 0, 1, nH * thisSignature.dataPoints[l]);

			}

			if(thisSignature.peaks < 3){
				signatures.splice(k, 1);
				k -= 1;
				continue;
			}

			thisSignature.signatureImage.src = analyserCanvas.toDataURL('image/png');

			console.log(thisSignature.counts);
			console.log(k, signatures.length);
			console.log(signatures[k])
			console.log("MIN:", min, "MAX:", max);

			console.log(scaleValue);
			console.log(thisSignature.dataPoints, thisSignature.dataPoints.length);

		}

		signatures.forEach(function(originalSignature){
			console.log("sig");
			// document.body.appendChild(originalSignature.signatureImage);

			signatures.forEach(function(compareSignature){

				if(originalSignature.id === compareSignature.id){
					return;
				}

				var overlap = 0;
				var originalOnes = originalSignature.dataPoints.filter(dp => {
					return dp === 1;
				});

				var compOnes = compareSignature.dataPoints.filter(dp => {
					return dp === 1;
				});

				for(var od = 0; od < originalSignature.dataPoints.length; od += 1){

					if(originalSignature.dataPoints[od] === 1 && compareSignature.dataPoints[od] === 1){
						overlap += 1;
					}

					/*if(originalSignature.dataPoints[od] === 1 && compareSignature.dataPoints[od] === 0){
						overlap -= 0.1;
					}*/

				}

				originalSignature.isLike.push({
					id : compareSignature.id,
					overlap : overlap,
					percentage : 100 / (originalOnes.length / overlap),
					nI : compareSignature.normalisedImage,
					sI : compareSignature.signatureImage
				});

			});

			originalSignature.isLike.sort(function(a, b){

				if(a.percentage > b.percentage){
					return -1;
				} else if(a.percentage < b.percentage){
					return 1;
				}

				return 0;

			});

			var similarityThreshold = 10;

			originalSignature.isLike = originalSignature.isLike.filter(function(l){

				if(l.percentage < similarityThreshold){
					return false;
				} else {
					return true;
				}
			})

		});

		console.log(signatures);

		generateReport();

	}

	function generateReport(){
		
		document.body.innerHTML = "";

		signatures.forEach(function(signature){

			var li = document.createElement('li');
			var dOne = document.createElement('div');
			var dTwo = document.createElement('div');
			dTwo.setAttribute('class', 'dTwo');
			dOne.innerHTML = "<img src='" + signature.normalisedImage.src + "' /> <img src='" + signature.signatureImage.src + "'> Signature: " + signature.id + " is like:"

			signature.isLike.forEach((comparative, idx) => {

				if(idx > 2){
					return;
				}

				dTwo.innerHTML += "<br>" + comparative.id + " " + comparative.percentage + "% <br><img src='" + comparative.nI.src + "' /><img src='" + comparative.sI.src + "' />" ;

			});

			li.appendChild(dOne);
			li.appendChild(dTwo);
			document.body.appendChild(li);

		});

	}


}());
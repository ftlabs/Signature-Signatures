/*global document, signature, sources, correlate */

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
			// debugger;
			document.body.appendChild(this);

			var sig = {
				id : this.getAttribute('data-id'),
				image : this,
				normalisedImage : new Image(),
				counts : undefined,
				scaledCounts : undefined,
				firstPeak : 0,
				peaks : [],
				signatureImage : new Image(),
				profileImages : [],
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

		// console.log(sources[x]);

	}

	function normalise(){
		// console.log('Normalise');

		for(var z = 0; z < signatures.length; z += 1){

			var thisSource = signatures[z].image;

			normaliserCanvas.width = thisSource.width;
			normaliserCanvas.height = thisSource.height;
			nCtx.drawImage(thisSource, 0, 0);
			// nCtx.drawImage(thisSource, 0, 0, imageSize, imageSize); 

			var pixelData = nCtx.getImageData(0,0,normaliserCanvas.width, normaliserCanvas.height);
			var d = pixelData.data;

			var t = normaliserCanvas.height;
			var l = normaliserCanvas.width;
			var r = 0;
			var b = 0;

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

					// counts[x] += 1;

				} else {
					g = 255;
				}
	
				d[yy] = d[yy + 1] = d[yy + 2] = g;

			}

			nCtx.putImageData(pixelData, 0, 0);

			// console.log(l, r, b, t);

			// counts.splice(r, normaliserCanvas.width - r);
			// counts.splice(0, l);

			// signatures[z].counts = counts;

			var cropped = nCtx.getImageData(l, t, l + r-l, t + b - t);
			normaliserCanvas.width = r - l;
			normaliserCanvas.height = b - t;
			nCtx.putImageData(cropped, 0, 0);
			signatures[z].normalisedImage.src = normaliserCanvas.toDataURL('image/png');

			var imageSize = 500;

			normaliserCanvas.width = imageSize;
			normaliserCanvas.height = imageSize;

			nCtx.drawImage(signatures[z].normalisedImage, 0, 0, imageSize, imageSize);
			signatures[z].normalisedImage.src = normaliserCanvas.toDataURL('image/png');

		}

		// analyseImages();
		generateProfiles();
	}

	function generateProfiles(){

		signatures.forEach(signature => {

			var source = signature.normalisedImage;
			
			analyserCanvas.width = source.width;
			analyserCanvas.height = source.height;

			aCtx.drawImage(source, 0, 0);
			// debugger;
			var pixelData = aCtx.getImageData(0,0,analyserCanvas.width, analyserCanvas.height);
			var d = pixelData.data;

			var counts = new Array(analyserCanvas.width);
			
			for(var c = 0; c < counts.length; c += 1){
				counts[c] = 0;
			}

			for(var ww = 0; ww < d.length; ww += 4){
				
				var x = (ww / 4) % analyserCanvas.width;

				if(d[ww] === 0){

					counts[x] += 1;

				}

			}

			// console.log(counts, counts.length);
			signature.counts = counts;

			// If over 30% of the pixels in a column are black, it can be considered a peak
			var peakThreshold = source.height * 0.3 | 0; 


			var peakSampleSize = 5;

			for(var f = 0; f < counts.length; f += 1){

				if(counts[f] > peakThreshold){

					var peakPoints = [];

					for(var g = f + 1; g < counts.length; g += 1 ){

						if(counts[g] > peakThreshold){
							peakPoints.push(g);
						} else {
							break;
						}

					}

					if(peakPoints.length > peakSampleSize){

						var s = peakPoints.shift();
						var e = peakPoints.pop();
						var m = e - ((e - s) / 2) | 0;

						signature.peaks.push({
							start : s,
							middle : m,
							end : e
						});
					}

					f += g;

				}

			}

			// console.log(signature.peaks);

			signature.firstPeak = signature.peaks[0];

		});

		analyseImages()

	}

	function analyseImages(){

		signatures.forEach( signature => {
		
			var thisSource = signature.normalisedImage;

			analyserCanvas.width = thisSource.width;
			analyserCanvas.height = thisSource.height;
			aCtx.clearRect(0,0,analyserCanvas.width, analyserCanvas.height);
			aCtx.drawImage(thisSource, 0, 0);
			// nCtx.lineWidth = 1;

			var comparisons = signatures.map( comparisonSignature => {
				
				if(signature.id === comparisonSignature.id){
					return
				}

				aCtx.clearRect(0,0,analyserCanvas.width, analyserCanvas.height);			
				aCtx.fillStyle = "rgba(255,0,0,.5)";
				for(var g = 0; g < signature.counts.length; g += 1){

					aCtx.fillRect(g, analyserCanvas.height - signature.counts[g] , 1, signature.counts[g]);

				}

				aCtx.fillStyle = "rgba(0,0,255,.5)";
				for(var g = 0; g < comparisonSignature.counts.length; g += 1){

					aCtx.fillRect(g, analyserCanvas.height - comparisonSignature.counts[g] , 1, comparisonSignature.counts[g]);

				}

				signature.profileImages[parseInt(comparisonSignature.id)] = new Image()
				signature.profileImages[parseInt(comparisonSignature.id)].src = analyserCanvas.toDataURL('image/png');

				/*var offSetArray = comparisonSignature.counts.slice(0);

				for(var q = peakOffset; q < 0; q += 1){
					offSetArray.unshift(0);
					offSetArray.pop();
				}*/

				// console.log(offSetArray);
				// console.log("Not shifted:", correlate( signature.counts, comparisonSignature.counts ) );
				// console.log("Shifted:", correlate( signature.counts, offSetArray ) );

				// Dynamic Time Warping.
				// We're going to chop up our counts into 10 equal sections and shift them along the X axis
				// to a certain degree and check for a better correlation. The mean average of the best of these
				// comparisons will then be returned as the similarity value 								
				var sections = 10;
				var bestResults = [];
				var sectionSize = ((comparisonSignature.counts.length / sections) | 0);
				var maxMovement = sectionSize;

				for(var f = 0; f < sections - 1; f += 1){

					// console.log(((comparisonSignature.counts.length / sections) | 0) * f);

					const offset = ((comparisonSignature.counts.length / sections) | 0) * f;
					const shiftees = comparisonSignature.counts.slice( offset, offset + sectionSize );

					// console.log(shiftees);
					
					var bestSimilarity = 0;

					for(var g = -maxMovement; g < maxMovement; g += 1){

						const comparitiveChunk = signature.counts.slice( offset + g, (offset + g) + sectionSize );

						var v = correlate( shiftees, comparitiveChunk ); 

						if(v > bestSimilarity){
							bestSimilarity = v;
							// console.log(bestSimilarity);
						}

					}

					bestResults.push(bestSimilarity);

				}

				// console.log("DTW Similarity:", bestResults.reduce(function(a, b) { return a + b; }, 0) / bestResults.length);

				return {
					id : comparisonSignature.id,
					// similarity : correlate( signature.counts, comparisonSignature.counts ) 
					similarity :  bestResults.reduce(function(a, b) { return a + b; }, 0) / bestResults.length,
					source : comparisonSignature
				};

				/*comparisonSignature.peaks.forEach(peak => {

					aCtx.fillStyle = "green";				
					aCtx.fillRect(peak.start - peakOffset, 0, (peak.end-peakOffset) - (peak.start-peakOffset), analyserCanvas.height )
					aCtx.fillStyle = "blue";
					aCtx.fillRect(peak.middle - peakOffset, 0, 1, analyserCanvas.height);

				});*/

				/*signature.counts.forEach( ( count, idx ) => {
					// debugger;
					console.log(count, ':', comparisonSignature.counts[idx + peakOffset]);

				});*/

			});
			
			comparisons = comparisons.filter(o => {
				return o !== undefined;
			})
			
			comparisons = comparisons.sort( (a,b) => {

				if(a.similarity > b.similarity){
					return -1
				} else {
					return 1
				}

				return 0;

			} );

			console.log(comparisons);

			console.log(signature.id, 'is most like', comparisons[0].id, '=>', comparisons[0].similarity);

			if(comparisons[0].similarity > 0.6){
				document.querySelector('#results').innerHTML += `<li><img src="${signature.normalisedImage.src}" data-id="${signature.id}">${signature.id} is most like ${comparisons[0].id}<img src="${comparisons[0].source.normalisedImage.src}" data-id="${comparisons[0].id}">${comparisons[0].similarity}<img src="${signature.profileImages[parseInt(comparisons[0].id)].src}"></li>`;
			}

			signature.comparisons = comparisons;

		});

	}

}());
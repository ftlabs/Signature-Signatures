const compare = (function(){

	'use strict';

	/*const analyserCanvas = document.createElement('canvas');
	const aCtx = analyserCanvas.getContext('2d');

	const normaliserCanvas = document.createElement('canvas');
	const nCtx = analyserCanvas.getContext('2d');*/

	const c1 = document.createElement('canvas');
	const c2 = document.createElement('canvas');
	
	c1.setAttribute('hidden', 'true');
	c2.setAttribute('hidden', 'true');

	document.body.appendChild(c1);
	document.body.appendChild(c2);

	const canvi = document.querySelectorAll('canvas');

	const analyserCanvas = c1;
	const aCtx = analyserCanvas.getContext('2d');

	const normaliserCanvas = c2;
	const nCtx = normaliserCanvas.getContext('2d');

	function normaliseImage(image){
		// console.log('Normalise');

		var thisSource = image;

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

		var cropped = nCtx.getImageData(l, t, l + r-l, t + b - t);
		normaliserCanvas.width = r - l;
		normaliserCanvas.height = b - t;
		nCtx.putImageData(cropped, 0, 0);
		image.src = normaliserCanvas.toDataURL('image/png');

		var imageSize = 500;

		normaliserCanvas.width = imageSize;
		normaliserCanvas.height = imageSize;

		nCtx.drawImage(image, 0, 0, imageSize, imageSize);
		image.src = normaliserCanvas.toDataURL('image/png');

		return image;

	}

	function generateProfile(image){

		var source = image;
		const data = {
			counts : undefined,
			scaledCounts : undefined,
			firstPeak : 0,
			peaks : []
		};

		analyserCanvas.width = source.width;
		analyserCanvas.height = source.height;

		aCtx.drawImage(source, 0, 0);

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

		data.counts = counts;

		// If over 30% of the pixels in a column are black, it can be considered a peak
		var peakThreshold = source.height * 0.3 | 0;
		// The width the peak has to be in order to be considerd a peak
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

					data.peaks.push({
						start : s,
						middle : m,
						end : e
					});
				}

				f += g;

			}

		}

		// console.log(data.peaks);

		data.firstPeak = data.peaks[0];

		return data;

	}

	function compareTheData(data1, data2){

		// Dynamic Time Warping.
		// We're going to chop up our counts into 10 equal sections and shift them along the X axis
		// to a certain degree and check for a better correlation. The mean average of the best of these
		// comparisons will then be returned as the similarity value 								
		var sections = 10;
		var bestResults = [];
		var sectionSize = ((data2.counts.length / sections) | 0);
		var maxMovement = sectionSize;

		for(var f = 0; f < sections - 1; f += 1){

			const offset = ((data2.counts.length / sections) | 0) * f;
			const shiftees = data2.counts.slice( offset, offset + sectionSize );
			
			var bestSimilarity = 0;

			for(var g = -maxMovement; g < maxMovement; g += 1){

				const comparitiveChunk = data1.counts.slice( offset + g, (offset + g) + sectionSize );

				var v = correlate( shiftees, comparitiveChunk ); 

				if(v > bestSimilarity){
					bestSimilarity = v;
				}

			}

			bestResults.push(bestSimilarity);

		}

		const similarity = bestResults.reduce(function(a, b) { return a + b; }, 0) / bestResults.length;

		return similarity;

	}

	function compareTwoImages(image1, image2){
		const start = performance.now();
		const d1 = generateProfile( normaliseImage(image1) );
		const d2 = generateProfile( normaliseImage(image2) );

		const result = compareTheData(d1, d2);
		console.log(performance.now() - start, 'ms to compare');

		normaliserCanvas.parentNode.removeChild(normaliserCanvas);
		analyserCanvas.parentNode.removeChild(analyserCanvas);

		return result;

	}

	return{
		images : compareTwoImages
	};

}());
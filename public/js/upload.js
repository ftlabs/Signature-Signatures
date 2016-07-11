var imageLoader = document.getElementById('imageLoader');
    imageLoader.addEventListener('change', handleImage);
var canvas = document.getElementById('imageCanvas');
var ctx = canvas.getContext('2d');
var topLeft;
var bottomRight;
var img = document.getElementById('image');

function handleImage(e){
    var reader = new FileReader();
    reader.onload = function(event){
        img.src = event.target.result;
    }
    reader.readAsDataURL(e.target.files[0]);
}

function getCursorPosition(element, event) {
    var rect = element.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    if (!topLeft) {
    	topLeft = [x,y];
    } else if (!bottomRight) {
    	bottomRight = [x,y];
    	resizeImage()
    } else {
    	bottomRight = undefined;
    	topLeft = undefined;
    }
}

img.addEventListener('click', getCursorPosition.bind(this, img))

document.addEventListener('keyup', function (e) {
	var code = e.keyCode || e.which;
	if (code === 27) {
		topLeft = undefined;
	}
});

function resizeImage () {
    canvas.width = bottomRight[0] - topLeft[0];
    canvas.height = bottomRight[1] - topLeft[1];
    ctx.drawImage(img, topLeft[0], topLeft[1], canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    img.src='';
};

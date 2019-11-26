/**
 * This class draws the clock in the background of the main page
 * The clock will keep the time of your machine. (ie: if you change the time in Windows,
 * the clock will eventually update to match
 * @author jacksonbrant@msoe.edu
 */

//Canvas elements for the clock
var canvas = document.getElementById("clock");
var ctx = canvas.getContext("2d");
var radius = canvas.height / 2;

/**
 * When the main page loads, the clock canvas and context are initialized
 */
$(document).ready(function () {
    ctx.translate(radius, radius);
    radius = radius * 0.90;
    var $canvas = $("#canvas");
    var $parent = $canvas.parent();
    $canvas.width($parent.width());
    $canvas.height($parent.height());
    //update every second
    setInterval(drawClock, 1000);
});

function drawClock() {
    drawFace(ctx, radius);
    drawTime(ctx, radius);
}

//Draws the body of the clock
function drawFace(ctx, radius) {
    var grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 5, 0, 2*Math.PI); //draw the outer arc
    ctx.fillStyle = 'white';
    ctx.fill();
    grad = ctx.createRadialGradient(0,0,radius*0.95, 0,0,radius*1.05);
    grad.addColorStop(0, PROJECT_COLOR);
    grad.addColorStop(0.5, 'white');
    grad.addColorStop(1, PROJECT_COLOR);
    ctx.strokeStyle = grad;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius*0.07, 0, 2*Math.PI); //draw the center of the clock
    ctx.fillStyle = PROJECT_COLOR;
    ctx.fill();
}

//Draws the hands by determining the current time - time is determined by the local machine
//interval should be set for every second
function drawTime(ctx, radius){
    var now = new Date();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    //hour hand for 12 hour clock
    hour=hour%12;
    hour=(hour*Math.PI/6)+
        (minute*Math.PI/(6*60))+
        (second*Math.PI/(360*60));
    drawHand(ctx, hour, radius*0.5, radius*0.07);
    //minute hand
    minute=(minute*Math.PI/30)+(second*Math.PI/(30*60));
    drawHand(ctx, minute, radius*0.8, radius*0.05);
    //second hand
    second=(second*Math.PI/30);
    drawHand(ctx, second, radius*0.75, radius*0.02);
}

//Draws the physical hands of the clock
function drawHand(ctx, pos, length, width) {
    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.moveTo(0,0);
    ctx.rotate(pos);
    ctx.lineTo(0, -length);
    ctx.stroke();
    ctx.rotate(-pos);
}
window.addEventListener("load",() => {
    const canvas = document.getElementById("drawing-canvas");
    const context = canvas.getContext("2d");
    
    const toolbar = document.querySelector(".toolbar");
    const colorPicker = document.getElementById("color-picker");
    const strokeWidth = document.getElementById("stroke-width");
    const brush = document.getElementById("brush");
    const eraser = document.getElementById("eraser");
    const clearButton = document.getElementById("clear-button");
    const undoButton = document.getElementById("undo-button");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - toolbar.offsetHeight;

    let drawing = false;
    let currentTool = "brush";

    let history = [];

    function saveHistory(){
        history.push(context.getImageData(0, 0, canvas.width, canvas.height));
        if(history.length > 20){
            history.shift();
        }
    }

    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = colorPicker.value;
    context.lineWidth = strokeWidth.value;

    saveHistory();


    function startdrawing(e){
        drawing = true;
        context.beginPath();
        context.moveTo(e.offsetX, e.offsetY);
    }

    function draw(e){
        if(!drawing) return;
        context.lineTo(e.offsetX, e.offsetY);
        context.stroke();
    }

    function stopdrawing(){
        if(!drawing) return;
        drawing = false;
        saveHistory();
}
  
    canvas.addEventListener("mousedown", startdrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopdrawing);
    canvas.addEventListener("mouseout", stopdrawing);

    colorPicker.addEventListener("change", (e) =>{
        context.strokeStyle = e.target.value;
    });

    strokeWidth.addEventListener("input",(e) =>{
        context.lineWidth = e.target.value;
    });

    brush.addEventListener("click",() => {
        currentTool = "brush";
        context.globalCompositeOperation = "source-over";
        eraser.classList.remove("active");
        brush.classList.add("active");
    });

    eraser.addEventListener("click", () => {
        currentTool = "eraser";
        context.globalCompositeOperation = "destination-out";
        brush.classList.remove("active");
        eraser.classList.add("active");
    });

    clearButton.addEventListener("click", () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        history = [];
        saveHistory();
    });

    undoButton.addEventListener("click", () => {
        if(history.length > 1){
            history.pop();
            const lastState = history[history.length - 1];
            if(lastState){
                context.putImageData(lastState, 0, 0);
            }
            else{
                context.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    });

    window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - toolbar.offsetHeight;

        history = [];
        saveHistory();

        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = colorPicker.value;
        context.lineWidth = strokeWidth.value;
        context.globalCompositeOperation = (currentTool === "eraser") ? "source-over" : "destination-out";
    });

});
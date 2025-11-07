window.addEventListener("load",() => {
    const socket = io();
    socket.on('connect', () => {
        console.log('Connected to server with ID:' + socket.id);
    });
    
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
        if(history.length > 50){
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

        socket.emit('draw:start', {
            x: e.offsetX,
            y: e.offsetY,
        color: context.strokeStyle,
        lineWidth: context.lineWidth,
        tool: currentTool,
        });
    }

    function draw(e){
        if(!drawing) return;
        context.lineTo(e.offsetX, e.offsetY);
        context.stroke();

        socket.emit('draw:move', {
            x: e.offsetX,
            y: e.offsetY
        });
    }

    function stopdrawing(){
        if(!drawing) return;
        drawing = false;
        saveHistory();

        socket.emit('draw:stop',{});
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

    const otherUsers = new Map();

    socket.on('draw:start', (data) => {
        console.log('Another user started drawing');

        otherUsers.set(data.socketId, data);

        context.beginPath();
        context.moveTo(data.x, data.y);

        const ogStroke = context.strokeStyle;
        const ogWidth = context.lineWidth;
        const ogOps = context.globalCompositeOperation;

        context.strokeStyle= data.color;
        context.lineWidth = data.lineWidth;
        context.globalCompositeOperation = (data.tool === 'eraser') ? 'destination-out' : 'source-over';

        context.strokeStyle = ogStroke;
        context.lineWidth = ogWidth;
        context.globalCompositeOperation = ogOps;
    });

    socket.on('daw:move', (data) => {
        const userData = otherUsers.get(data.socketId);
        if(!userData) return;

        context.loneTo(data.x, data.y);
        context.stroke();
    });

    socket.on('draw:stop', (data) =>{
        otherUsers.delete(data.socketId);
        console.log('A user stopped drawing');
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
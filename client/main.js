window.addEventListener("load",() => {
    const socket = io();
    socket.on('connect', () => {
        console.log('Connected to server with ID:' + socket.id);
        socket.emit('requestFullCanvas');
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
    
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = colorPicker.value;
    context.lineWidth = strokeWidth.value;


    let drawing = false;
    let currentTool = "brush";
    let currentPath = [];
    let history = [];

    socket.on('draw:operation', (op) => {
        history.push(op);
        drawOperation(op);
    });

    const loadHistory = (serverHistory) => {
        console.log(`Loadig history with ${serverHistory.length} ops`);
        histoy = serverHistory;
        redrawCanvas();
    };

    socket.on('fullCanvas', loadHistory);
    socket.on('opStore:load', loadHistory);

    /** @param {object} op */
    
    function drawOperation(op){
        if(!op || !op.path || op.path.length < 2) return;

        const ogStroke = context.strokeStyle;
        const ogWidth = context.lineWidth;
        const ogOps = context.globalCompositeOperation;

        context.beginPath();
        context.moveTo(op.path[0].x, op.path[0].y);

        for(let i = 1; i < op.path.length - 2; i++){
            const p0 = op.path[i];
            const p1 = op.path[i + 1];
            const midX = (p0.x + p1.x) / 2;
            const midY = (p0.y + p1.y) / 2;
            context.quadraticCurveTo(p0.x, p0.y, midX, midY);
        }
        const last = op.path[op.path.length - 1];
        context.lineTo(last.x, last.y);
        context.stroke();

        context.strokeStyle = ogStroke;
        context.lineWidth = ogWidth;
        context.globalCompositeOperation = ogOps;
    }

    function redrawCanvas(){
        context.clearRect(0, 0, canvas.width, canvas.height);
        for(const op of history){
            drawOperation(op);
        }
    }

    function startdrawing(e){
        drawing = true;
        context.beginPath();
        context.moveTo(e.offsetX, e.offsetY);

        currentPath = [{x : offsetX, y : offsetY}];
    }

    function draw(e){
        if(!drawing) return;
        context.lineTo(e.offsetX, e.offsetY);
        context.stroke();

        currentPath.push({x : offsetX, y : offsetY});
    }

    function stopdrawing(){
        if(!drawing) return;
        drawing = false;

        if(currentPath.length > 1){
            socket.emit('draw:operation',{
                color: context.strokeStyle,
                lineWidth: context.lineWidth,
                tool: currentTool,
                path: currentPath
            });
        }

        currentPath = [];
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
        socket.emit('opStore:clear');
    });

    undoButton.addEventListener("click", () => {
        console.log('Requesting server to undo');
        socket.emit('opStore:undo');
    });

    window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - toolbar.offsetHeight;

        redrawCanvas();

        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = colorPicker.value;
        context.lineWidth = strokeWidth.value;
        context.globalCompositeOperation = (currentTool === "eraser") ? "source-over" : "destination-out";
    });

});
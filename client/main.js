window.addEventListener("load",() => {
    const socket = io();
    
    const canvas = document.getElementById("drawing-canvas");
    const context = canvas.getContext("2d");
    
    const toolbar = document.querySelector(".toolbar");
    const colorPicker = document.getElementById("color-picker");
    const strokeWidth = document.getElementById("stroke-width");
    const brush = document.getElementById("brush");
    const eraser = document.getElementById("eraser");
    const clearButton = document.getElementById("clear-button");
    const undoButton = document.getElementById("undo-button");
    const redoButton = document.getElementById("redo-button");
    const userList = document.getElementById("user-list");
    
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
    
    const userCursors = new Map();
    
    socket.on('connect', () => {
        console.log('Connected to server with ID:' + socket.id);
        socket.emit('requestFullCanvas');
    });

    socket.on('draw:operation', (op) => {
        history.push(op);
        drawOperation(op);
    });

    const loadHistory = (serverHistory) => {
        console.log(`Loading history with ${serverHistory.length} ops`);
        history = serverHistory;
        redrawCanvas();
    };
    
    socket.on('fullCanvas', loadHistory);
    socket.on('opStore:load', loadHistory);
    
    socket.on('cursor:move', (data) => {
        let cursorDiv = userCursors.get(data.socketId);

        if(!cursorDiv){
            cursorDiv = document.createElement('div');
            cursorDiv.className = 'cursor';
            const hash = data.socketId.split('').reduce((acc,char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
            const color = `hsl(${hash % 360}, 100%, 50%)`;
            cursorDiv.style.backgroundColor = color;
            document.body.appendChild(cursorDiv);
            userCursors.set(data.socketId, cursorDiv);
        }

        const x = data.x;
        const y = data.y + toolbar.offsetHeight;

        cursorDiv.style.left = x + 'px';
        cursorDiv.style.top = y + 'px';
    });

    socket.on('user:update', (users) => {
        userList.innerHTML = '';
        for(const id in users){
            const userEl = document.createElement('li');
            userEl.innerText = `User: ${id.substring(0, 5)}`;
            if(id == socket.id){
                userEl.innerText += ' (You) ';
            }
            userList.appendChild(userEl);
        }
    });

    socket.on('user:disconnect', (socketId) => {
        const cursorDiv = userCursors.get(socketId);
        if(cursorDiv){
            cursorDiv.remove();
            userCursors.delete(socketId);
        }
    });


    /** @param {object} op */
    
    function drawOperation(op){
        if(!op || !op.path || op.path.length < 2) return;

        const ogStroke = context.strokeStyle;
        const ogWidth = context.lineWidth;
        const ogOps = context.globalCompositeOperation;
        context.strokeStyle = op.color;
        context.lineWidth = op.lineWidth;
        context.globalCompositeOperation = (op.tool === "eraser") ? "destination-out" : "source-over";

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

        currentPath = [{x : e.offsetX, y : e.offsetY}];
    }

    function draw(e){
        if(!drawing) return;
        context.lineTo(e.offsetX, e.offsetY);
        context.stroke();

        currentPath.push({x : e.offsetX, y : e.offsetY});
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

    canvas.addEventListener("mousemove", (e) => {
        socket.emit('cursor:move', {
            x: e.offsetX,
            y: e.offsetY
        });
    });

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

    redoButton.addEventListener("click", () => {
        console.log('Requesting server to redo');
        socket.emit('opStore:redo');
    })

    window.addEventListener("resize", () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight - toolbar.offsetHeight;

        redrawCanvas();

        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = colorPicker.value;
        context.lineWidth = strokeWidth.value;
        context.globalCompositeOperation = (currentTool === "eraser") ? "destination-out" : "source-over";
    });

});
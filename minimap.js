console.log("Graph Mirroring Script Loaded");

// Function to create and inject the mini-graph canvas into the DOM
function createMiniGraphCanvas(settings) {
    const miniGraphDiv = document.createElement('div');
    miniGraphDiv.id = 'minimap'; 
    miniGraphDiv.style.position = 'absolute';
    miniGraphDiv.style.top = `${settings.top}px`;
    miniGraphDiv.style.left = `${settings.left}px`;
    miniGraphDiv.style.width = `${settings.width}px`;
    miniGraphDiv.style.height = `${settings.height}px`;
    miniGraphDiv.style.border = '1px solid #222';
    miniGraphDiv.style.backgroundColor = '#282828';
    miniGraphDiv.style.zIndex = 1000;

    document.body.appendChild(miniGraphDiv);

    const miniGraphCanvas = document.createElement('canvas');
    miniGraphCanvas.width = settings.width;
    miniGraphCanvas.height = settings.height;
    miniGraphDiv.appendChild(miniGraphCanvas);

    return miniGraphCanvas;
}

// Function to render the graph onto the mini-graph canvas
function renderMiniGraph(graph, miniGraphCanvas) {
    const ctx = miniGraphCanvas.getContext('2d');
    
    // Get the background color of the workflow
    const canvasElement = document.querySelector('canvas');
    const backgroundColor = getComputedStyle(canvasElement).backgroundColor;

    // Clear the entire mini-graph canvas
    ctx.clearRect(0, 0, miniGraphCanvas.width, miniGraphCanvas.height);
    
    // Fill the canvas with the background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, miniGraphCanvas.width, miniGraphCanvas.height);

    // Calculate the scale based on the graph bounds
    const bounds = getGraphBounds(graph);
    const scaleX = miniGraphCanvas.width / (bounds.width + 200); // Add padding for better visualization
    const scaleY = miniGraphCanvas.height / (bounds.height + 200);
    const scale = Math.min(scaleX, scaleY);

    // Draw connections (links) between nodes first
    graph.links.forEach(link => {
        const originNode = graph._nodes_by_id[link.origin_id];
        const targetNode = graph._nodes_by_id[link.target_id];

        if (originNode && targetNode) {
            ctx.strokeStyle = '#666'; // Slightly darker gray for connections
            ctx.lineWidth = 0.5;

            // Correctly calculate positions for the connections
            const originX = (originNode.pos[0] + originNode.size[0] / 2 - bounds.left) * scale;
            const originY = (originNode.pos[1] + originNode.size[1] / 2 - bounds.top) * scale;
            const targetX = (targetNode.pos[0] + targetNode.size[0] / 2 - bounds.left) * scale;
            const targetY = (targetNode.pos[1] + targetNode.size[1] / 2 - bounds.top) * scale;

            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();
        }
    });

    // Render groups (if any)
    graph._groups.forEach(group => {
        ctx.fillStyle = group.color || '#ccc'; // Use group color or default
        const x = (group.pos[0] - bounds.left) * scale;
        const y = (group.pos[1] - bounds.top) * scale;
        const width = group.size[0] * scale;
        const height = group.size[1] * scale;
        ctx.fillRect(x, y, width, height);
    });

    // Render nodes on top of the connections
    graph._nodes.forEach(node => {
        const nodeColor = node.color || '#353535'; // Default to gray if no color is set
        
        ctx.fillStyle = nodeColor;
        
        // Scale the node position and size to fit the mini-graph canvas
        const x = (node.pos[0] - bounds.left) * scale;
        const y = (node.pos[1] - bounds.top) * scale;
        const width = node.size[0] * scale;
        const height = node.size[1] * scale;
        
        ctx.fillRect(x, y, width, height);
    });

    // Draw the viewport rectangle
    drawViewportRectangle(ctx, bounds, scale);

    // Store scale and bounds for click handling
    miniGraphCanvas.scale = scale;
    miniGraphCanvas.bounds = bounds;
}

// Function to draw the viewport rectangle
function drawViewportRectangle(ctx, bounds, scale) {
    const canvasElement = document.querySelector('canvas');
    const viewportWidth = canvasElement.clientWidth / window.app.canvas.ds.scale;
    const viewportHeight = canvasElement.clientHeight / window.app.canvas.ds.scale;
    const offsetX = -window.app.canvas.ds.offset[0];
    const offsetY = -window.app.canvas.ds.offset[1];

    const x = (offsetX - bounds.left) * scale;
    const y = (offsetY - bounds.top) * scale;
    const width = viewportWidth * scale;
    const height = viewportHeight * scale;

    ctx.strokeStyle = 'rgba(168, 219, 235, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
}

// Function to calculate the bounds of the graph
function getGraphBounds(graph) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    graph._nodes.forEach(node => {
        if (node.pos[0] < minX) minX = node.pos[0];
        if (node.pos[1] < minY) minY = node.pos[1];
        if (node.pos[0] + node.size[0] > maxX) maxX = node.pos[0] + node.size[0];
        if (node.pos[1] + node.size[1] > maxY) maxY = node.pos[1] + node.size[1];
    });

    // Include group bounds if groups exist
    graph._groups.forEach(group => {
        if (group.pos[0] < minX) minX = group.pos[0];
        if (group.pos[1] < minY) minY = group.pos[1];
        if (group.pos[0] + group.size[0] > maxX) maxX = group.pos[0] + group.size[0];
        if (group.pos[1] + group.size[1] > maxY) maxY = group.pos[1] + group.size[1];
    });

    return {
        left: minX,
        top: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

// Function to initialize the mini-graph and start the rendering loop
function initializeMiniGraph(settings) {
    const miniGraphCanvas = createMiniGraphCanvas(settings);

    function updateMiniGraph() {
        renderMiniGraph(window.app.graph, miniGraphCanvas);
    }

    // Handle click events on the mini-graph canvas to center the main graph
    miniGraphCanvas.addEventListener('click', function(event) {
        // Only proceed if the Ctrl key is not pressed
        if (event.ctrlKey) {
            return; // Exit the function without performing any action
        }

        const rect = miniGraphCanvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const graphX = clickX / miniGraphCanvas.scale + miniGraphCanvas.bounds.left;
        const graphY = clickY / miniGraphCanvas.scale + miniGraphCanvas.bounds.top;

        // Center the main canvas around the clicked point
        const canvasElement = document.querySelector('canvas');
        const viewportWidth = canvasElement.clientWidth / window.app.canvas.ds.scale;
        const viewportHeight = canvasElement.clientHeight / window.app.canvas.ds.scale;

        window.app.canvas.ds.offset[0] = -(graphX - viewportWidth / 2);
        window.app.canvas.ds.offset[1] = -(graphY - viewportHeight / 2);

        window.app.canvas.setDirty(true, true); // Force redraw
    });

    // Update the mini-graph immediately and then on every frame
    updateMiniGraph();
    setInterval(updateMiniGraph, 100); // Adjust the interval as needed
}

// Ensure the app and graph are ready before initializing the mini-graph
function waitForAppAndGraph() {
    const interval = setInterval(() => {
        if (window.app && window.app.graph && window.app.graph._nodes && window.app.graph._nodes.length > 0) {
            console.log("App and Graph are ready with nodes:", window.app.graph._nodes.length);
            clearInterval(interval); // Stop checking once the app and graph are ready

            // Load settings from localStorage (or use defaults)
            const settings = JSON.parse(localStorage.getItem('minimapSettings')) || {
                top: 0,
                left: 0,
                width: 240,
                height: 140,
                opacity: 1
            };

            initializeMiniGraph(settings); // Start the mini-graph with loaded settings
        } else {
            console.log("Waiting for app and graph to be ready...");
        }
    }, 500); // Check every 1 second
}

// Start the waiting process
waitForAppAndGraph();

import { api } from '../../scripts/api.js';

console.log("Graph Mirroring Script Loaded");
let currentExecutingNode = "0";

// Function to create and inject the mini-graph canvas into the DOM
function createMiniGraphCanvas(settings) {
    const miniGraphDiv = document.createElement('div');
    miniGraphDiv.id = 'minimap';
    miniGraphDiv.style.position = 'absolute';
    miniGraphDiv.style.top = `${settings.top}px`;
    miniGraphDiv.style.left = `${settings.left}px`;
    miniGraphDiv.style.width = `${settings.width}px`;
    miniGraphDiv.style.height = `${settings.height}px`;
    miniGraphDiv.style.border = '1px solid var(--border-color)';
    miniGraphDiv.style.backgroundColor = 'var(--bg-color)';
    miniGraphDiv.style.zIndex = 1000;

    document.body.appendChild(miniGraphDiv);

    const miniGraphCanvas = document.createElement('canvas');
    miniGraphCanvas.width = settings.width;
    miniGraphCanvas.height = settings.height;
    miniGraphDiv.appendChild(miniGraphCanvas);

    return miniGraphCanvas;
}

function getTypeColor(link) {
    const type = link.type;
    let color = app.canvas.default_connection_color_byType[type]
    if (color == "") {
        switch (type) {
            case "STRING":
            case "INT":
                color = "#77ff77"
                break
            default:
                color = "#666"
                if (link.color != undefined) {
                    color = link.color;
                }
                break
        }
    }
    return color
}

function getLinkPosition(originNode, targetNode, bounds, link, scale) {
    const xOffset = 10;
    const topPadding = 10 * scale; // Space for node title
    const linkPadding = 20 * scale; // Space between inputs

    function calculateX(node, isOrigin) {
        const nodeX = node.pos[0] + (isOrigin ? node.size[0] - xOffset : xOffset);
        return (nodeX - bounds.left) * scale;
    }

    function calculateY(node, slot) {
        if (node.isVirtualNode) {
            return (node.pos[1] - bounds.top + node.size[1] * 0.5) * scale;
        }

        const nodeTop = (node.pos[1] - bounds.top) * scale;
        return nodeTop + topPadding + slot * linkPadding;
    }

    const originX = calculateX(originNode, true);
    const targetX = calculateX(targetNode, false);

    const originY = calculateY(originNode, link.origin_slot);
    const targetY = calculateY(targetNode, link.target_slot);

    return [originX, originY, targetX, targetY];
}


function drawDot(ctx, x, y, color, scale) {
    ctx.beginPath();
    ctx.arc(x, y, 3 * scale, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}

// Function to render the graph onto the mini-graph canvas
function renderMiniGraph(graph, miniGraphCanvas) {
    const rootStyles = getComputedStyle(document.documentElement);
    const defaultNodeColor = rootStyles.getPropertyValue('--comfy-menu-bg').trim();

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
            ctx.strokeStyle = getTypeColor(link);
            ctx.lineWidth = 0.5;

            // Correctly calculate positions for the connections
            const [originX, originY, targetX, targetY] = getLinkPosition(originNode, targetNode, bounds, link, scale);

            ctx.beginPath();
            ctx.moveTo(originX, originY);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();

            // Store the coordinates for the dots
            link._originPos = { x: originX, y: originY };
            link._targetPos = { x: targetX, y: targetY };
        }
    });

    // Render groups (if any)
    graph._groups.forEach(group => {
        ctx.fillStyle = group.color || '#ccc'; // Use group color or default
        ctx.globalAlpha = 0.35;
        const x = (group.pos[0] - bounds.left) * scale;
        const y = (group.pos[1] - bounds.top) * scale;
        const width = group.size[0] * scale;
        const height = group.size[1] * scale;
        ctx.fillRect(x, y, width, height);
        ctx.globalAlpha = 1.0;
    });

    // Render nodes on top of the connections
    graph._nodes.forEach(node => {
        const nodeColor = node.color || defaultNodeColor;
        // For some reason, the top title of the nodes are not included in the size.
        let heightPadding = node.isVirtualNode ? 0 : 30;

        ctx.fillStyle = nodeColor;

        // Scale the node position and size to fit the mini-graph canvas
        const x = (node.pos[0] - bounds.left) * scale;
        const y = (node.pos[1] - bounds.top - heightPadding) * scale;
        const width = node.size[0] * scale;
        const height = (node.size[1] + heightPadding) * scale;

        ctx.fillRect(x, y, width, height);

        if (node.id == currentExecutingNode) {
            ctx.strokeStyle = 'green';
            ctx.lineWidth = 1;

            // Draw the outline
            ctx.strokeRect(x, y, width, height);
        }
    });

    // Draw all the dots on top
    if (scale > 0.15) {
        graph.links.forEach(link => {
            if (link._originPos && link._targetPos) {
                const dotColor = getTypeColor(link);

                drawDot(ctx, link._originPos.x, link._originPos.y, dotColor, scale);
                drawDot(ctx, link._targetPos.x, link._targetPos.y, dotColor, scale);
            }
        });
    }

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
    let isDragging = false;

    function updateMiniGraph() {
        renderMiniGraph(window.app.graph, miniGraphCanvas);
    }

    // Handle mouse down event
    miniGraphCanvas.addEventListener('mousedown', function(event) {
        // Only proceed if the Ctrl key is not pressed
        if (event.ctrlKey) {
            return; // Exit the function without performing any action
        }

        isDragging = true;
        moveMainCanvas(event, miniGraphCanvas);
    });

    // Handle mouse move event (for dragging)
    miniGraphCanvas.addEventListener('mousemove', function(event) {
        if (isDragging) {
            moveMainCanvas(event, miniGraphCanvas);
        }
    });

    // Handle mouse up event
    miniGraphCanvas.addEventListener('mouseup', function() {
        isDragging = false;
    });

    // Handle mouse out event (stop dragging if mouse leaves the minimap)
    miniGraphCanvas.addEventListener('mouseout', function() {
        isDragging = false;
    });

    // Update the mini-graph immediately and then on every frame
    updateMiniGraph();
    setInterval(updateMiniGraph, 100); // Adjust the interval as needed
}

// Function to move the main canvas based on the mouse event
function moveMainCanvas(event, miniGraphCanvas) {
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
}

// Ensure the app and graph are ready before initializing the mini-graph
function waitForAppAndGraph() {
    const interval = setInterval(() => {
        if (window.app && window.app.graph && window.app.graph._nodes && window.app.graph._nodes.length > 0) {
            console.log("App and Graph are ready with nodes:", window.app.graph._nodes.length);
            clearInterval(interval); // Stop checking once the app and graph are ready

            // Load settings from localStorage (or use defaults)
            const settings = JSON.parse(localStorage.getItem('minimapSettings')) || {
                top: window.innerHeight - 140, // Start from bottom
                left: window.innerWidth - 240, // Start from right
                width: 240,
                height: 140,
                opacity: 1
            };

            api.addEventListener("executing", (e) => {
                const nodeId = e.detail
                if (nodeId != null) {
                    currentExecutingNode = nodeId;
                    return;
                }
                currentExecutingNode = 0;
            });

            initializeMiniGraph(settings); // Start the mini-graph with loaded settings
        } else {
            console.log("Waiting for app and graph to be ready...");
        }
    }, 500); // Check every 1 second
}

// Start the waiting process
waitForAppAndGraph();

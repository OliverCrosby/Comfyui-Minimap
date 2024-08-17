// Load interact.js from CDN
const interactScript = document.createElement('script');
interactScript.src = 'https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js';
document.head.appendChild(interactScript);

interactScript.onload = () => {
    // Wait for the #minimap to be injected into the DOM
    function waitForMinimap() {
        const interval = setInterval(() => {
            const miniMapElement = document.getElementById('minimap');
            if (miniMapElement) {
                clearInterval(interval);
                makeDraggable(miniMapElement);
                makeResizable(miniMapElement);
            }
        }, 500);
    }

    // Function to make the #minimap draggable and confined within the window
    function makeDraggable(miniMapElement) {
        const position = { x: 0, y: 0 };

        miniMapElement.classList.add('draggable');

        interact('#minimap').draggable({
            listeners: {
                start(event) {
                    position.x = parseFloat(miniMapElement.style.left) || 0;
                    position.y = parseFloat(miniMapElement.style.top) || 0;
                },
                move(event) {
                    position.x += event.dx;
                    position.y += event.dy;

                    const windowWidth = window.innerWidth - miniMapElement.offsetWidth;
                    const windowHeight = window.innerHeight - miniMapElement.offsetHeight;

                    position.x = Math.max(0, Math.min(position.x, windowWidth));
                    position.y = Math.max(0, Math.min(position.y, windowHeight));

                    miniMapElement.style.left = `${position.x}px`;
                    miniMapElement.style.top = `${position.y}px`;
                }
            }
        });
    }

    // Function to make the #minimap resizable
    function makeResizable(miniMapElement) {
        interact('#minimap').resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            listeners: {
                move(event) {
                    let { x, y } = event.target.getBoundingClientRect();

                    const { width, height } = event.rect;

                    // Adjust position when resizing from the left or top edges
                    if (event.edges.left) {
                        x += event.deltaRect.left;
                        miniMapElement.style.left = `${x}px`;
                    }
                    if (event.edges.top) {
                        y += event.deltaRect.top;
                        miniMapElement.style.top = `${y}px`;
                    }

                    miniMapElement.style.width = `${width}px`;
                    miniMapElement.style.height = `${height}px`;

                    // Update the size of the canvas inside the minimap
                    const miniGraphCanvas = miniMapElement.querySelector('canvas');
                    miniGraphCanvas.width = width;
                    miniGraphCanvas.height = height;
                }
            },
            modifiers: [
                interact.modifiers.restrictSize({
                    min: { width: 100, height: 60 },
                    max: { width: window.innerWidth, height: window.innerHeight }
                })
            ]
        });
    }

    waitForMinimap();
};

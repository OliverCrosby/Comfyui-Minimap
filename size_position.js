import { api } from '../../scripts/api.js';

// Load interact.js from CDN
const interactScript = document.createElement('script');
interactScript.src = 'https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js';
document.head.appendChild(interactScript);

// Initialize settings globally
let boundsSetting;
let snapTo;
let restrictToGraph;
let betaMenu;

const relativePosition = localStorage.getItem('minimapRelativePosition');
let relativeX = 0;
let relativeY = 0;

if (relativePosition) {
    const position = JSON.parse(relativePosition);
    relativeX = position.x ?? 0;
    relativeY = position.y ?? 0;
}

// Reload all settings
window.addEventListener('minimap.reloadSettings', async () => {
    const settings = await api.getSettings();

    boundsSetting = settings['minimap.KeepInBounds'] ?? true;
    snapTo = settings['minimap.SnapTo'] ?? 'none';
    restrictToGraph = settings['minimap.RestrictToGraph'] ?? false;
    betaMenu = settings['Comfy.UseNewMenu'] ?? 'Disabled';

    // Send resize event to trigger ensureMinimapInBounds
    const event = new Event('resize');
    window.dispatchEvent(event);
});

interactScript.onload = () => {
    let isCtrlPressed = false;
    let resizeTimeout;

    // Listen for keydown and keyup events to track the state of the Ctrl key
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Control') {
            isCtrlPressed = true;
        }
    });

    window.addEventListener('keyup', (event) => {
        if (event.key === 'Control') {
            isCtrlPressed = false;
        }
    });

    // Function to save minimap settings to local storage, including opacity
    function saveMinimapSettings(top, left, width, height, opacity) {
        const settings = {
            top: parseInt(top, 10),
            left: parseInt(left, 10),
            width: parseInt(width, 10),
            height: parseInt(height, 10),
            opacity: opacity
        };
        localStorage.setItem('minimapSettings', JSON.stringify(settings));
    }

    // Function to load minimap settings from local storage
    function loadMinimapSettings() {
        const settings = localStorage.getItem('minimapSettings');
        return settings ? JSON.parse(settings) : null;
    }

    // Apply the loaded settings
    function applyMinimapSettings(miniMapElement, settings) {
        if (settings) {
            miniMapElement.style.top = `${settings.top}px`;
            miniMapElement.style.left = `${settings.left}px`;
            miniMapElement.style.width = `${settings.width}px`;
            miniMapElement.style.height = `${settings.height}px`;
            miniMapElement.style.opacity = settings.opacity;
        }
    }

    function getComfyPadding() {
        if (betaMenu === 'Disabled') {
            return [0, 0, 0, 0];
        }

        const topPadding = restrictToGraph ? (window.app?.bodyTop?.clientHeight || 0) : 0;
        const bottomPadding = restrictToGraph ? (window.app?.bodyBottom?.clientHeight || 0) : 0;
        const leftPadding = restrictToGraph ? (window.app?.bodyLeft?.clientWidth || 0) : 0;
        const rightPadding = restrictToGraph ? (window.app?.bodyRight?.clientWidth || 0) : 0;

        return [topPadding, bottomPadding, leftPadding, rightPadding];
    }

    // Wait for the #minimap to be injected into the DOM
    function waitForMinimap() {
        const interval = setInterval(() => {
            const miniMapElement = document.getElementById('minimap');
            if (miniMapElement) {
                clearInterval(interval);
                const settings = loadMinimapSettings();
                applyMinimapSettings(miniMapElement, settings);
                makeDraggable(miniMapElement);
                makeResizable(miniMapElement);
                makeScrollable(miniMapElement);  // Add scroll handling for opacity
                ensureMinimapInBounds(miniMapElement); // Make sure minimap is in bounds
                saveRelativePosition(miniMapElement);

                window.addEventListener('resize', function() {
                    if (resizeTimeout) {
                        clearTimeout(resizeTimeout);
                    }

                    resizeTimeout = setTimeout(function() {
                        if (boundsSetting != false || snapTo != "none") {
                            ensureMinimapInBounds(miniMapElement);  // Ensure minimap stays within the window
                        }
                    }, 200);
                });
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
                    if (!isCtrlPressed) {
                        return event.interaction.stop(); // Prevent dragging if Ctrl is not held down
                    }
                    position.x = parseFloat(miniMapElement.style.left) || 0;
                    position.y = parseFloat(miniMapElement.style.top) || 0;
                },
                move(event) {
                    const [topPadding, bottomPadding, leftPadding, rightPadding] = getComfyPadding();

                    position.x += event.dx;
                    position.y += event.dy;

                    const windowWidth = window.innerWidth - miniMapElement.offsetWidth;
                    const windowHeight = window.innerHeight - miniMapElement.offsetHeight;

                    const maxX = windowWidth - rightPadding;
                    const maxY = windowHeight - bottomPadding;
                    const minX = leftPadding;
                    const minY = topPadding;

                    position.x = Math.max(minX, Math.min(position.x, maxX));
                    position.y = Math.max(minY, Math.min(position.y, maxY));

                    miniMapElement.style.left = `${position.x}px`;
                    miniMapElement.style.top = `${position.y}px`;

                    // Save the new position to the settings
                    const opacity = parseFloat(miniMapElement.style.opacity) || 1;
                    saveMinimapSettings(position.y, position.x, miniMapElement.offsetWidth, miniMapElement.offsetHeight, opacity);
                },
                end(event) {
                    saveRelativePosition(miniMapElement);
                }
            },
            cursorChecker(action) {
                // Only show the move cursor if Ctrl is pressed
                if (isCtrlPressed) {
                    return 'move';
                }
                return null;
            }
        });
    }

    // Function to make the #minimap resizable
    function makeResizable(miniMapElement) {
        interact('#minimap').resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            listeners: {
                start(event) {
                    if (!isCtrlPressed) {
                        return event.interaction.stop(); // Prevent resizing if Ctrl is not held down
                    }
                },
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

                    // Save the new size and position to the settings
                    const opacity = parseFloat(miniMapElement.style.opacity) || 1;
                    saveMinimapSettings(miniMapElement.style.top, miniMapElement.style.left, width, height, opacity);
                }
            },
            modifiers: [
                interact.modifiers.restrictSize({
                    min: { width: 100, height: 60 },
                    max: { width: window.innerWidth, height: window.innerHeight }
                })
            ],
            cursorChecker(action, interactable, element, interacting) {
                // Show appropriate resize cursor based on the edge being interacted with
                if (isCtrlPressed) {
                    if ((action.edges.left && action.edges.top) || (action.edges.right && action.edges.bottom)) {
                        return 'nwse-resize'; // Top-left or bottom-right corners
                    } else if ((action.edges.right && action.edges.top) || (action.edges.left && action.edges.bottom)) {
                        return 'nesw-resize'; // Top-right or bottom-left corners
                    } else if (action.edges.left || action.edges.right) {
                        return 'ew-resize'; // Horizontal resize
                    } else if (action.edges.top || action.edges.bottom) {
                        return 'ns-resize'; // Vertical resize
                    }
                }
                return null;
            }

        });
    }

    // Function to handle scrolling for opacity change
    function makeScrollable(miniMapElement) {
        miniMapElement.addEventListener('wheel', function(event) {
            if (isCtrlPressed) {
                event.preventDefault();  // Prevent default scroll action
                let opacity = parseFloat(miniMapElement.style.opacity) || 1;
                opacity += event.deltaY * -0.001;  // Adjust the opacity based on scroll direction
                opacity = Math.min(Math.max(opacity, 0.1), 1);  // Constrain opacity between 0.1 and 1
                miniMapElement.style.opacity = opacity;

                // Save the new opacity to the settings
                const top = parseFloat(miniMapElement.style.top);
                const left = parseFloat(miniMapElement.style.left);
                const width = parseFloat(miniMapElement.style.width);
                const height = parseFloat(miniMapElement.style.height);
                saveMinimapSettings(top, left, width, height, opacity);
            }
        });
    }

    function saveRelativePosition(miniMapElement) {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const miniMapRect = miniMapElement.getBoundingClientRect();

        relativeX = miniMapRect.left / windowWidth;
        relativeY = miniMapRect.top / windowHeight;
        localStorage.setItem('minimapRelativePosition', JSON.stringify({ x: relativeX, y: relativeY }));
    }

    function calculateSnappedMinimapPosition(miniMapElement, miniMapRect) {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Get padding so we don't overlap with the new UI
        const [topPadding, bottomPadding, leftPadding, rightPadding] = getComfyPadding();

        let newTop = parseFloat(miniMapElement.style.top);
        let newLeft = parseFloat(miniMapElement.style.left);

        switch (snapTo) {
            case "topleft":
                newTop = topPadding;
                newLeft = leftPadding;
                break;
            case "topright":
                newTop = topPadding;
                newLeft = windowWidth - miniMapRect.width - rightPadding;
                break;
            case "bottomleft":
                newTop = windowHeight - miniMapRect.height - bottomPadding;
                newLeft = leftPadding;
                break;
            case "bottomright":
                newTop = windowHeight - miniMapRect.height - bottomPadding;
                newLeft = windowWidth - miniMapRect.width - rightPadding;
                break;
            case "relative":
                newTop = relativeY * windowHeight;
                newLeft = relativeX * windowWidth;
                break;
            case "none":
                break;
            default:
                console.warn(`Invalid snapTo value: ${snapTo}`);
                break;
        }

        // Keep in bounds
        if (boundsSetting) {
            if (miniMapRect.top < topPadding) {
                newTop = topPadding;
            } else if (miniMapRect.bottom > windowHeight) {
                newTop = windowHeight - miniMapRect.height + topPadding;
            }

            if (miniMapRect.left < leftPadding) {
                newLeft = leftPadding;
            } else if (miniMapRect.right > windowWidth) {
                newLeft = windowWidth - miniMapRect.width - rightPadding;
            }
        }

        return [newTop, newLeft];
    }

    function ensureMinimapInBounds(miniMapElement) {
        const miniMapRect = miniMapElement.getBoundingClientRect();
        let [newTop, newLeft] = calculateSnappedMinimapPosition(miniMapElement, miniMapRect);

        miniMapElement.style.top = `${newTop}px`;
        miniMapElement.style.left = `${newLeft}px`;

        // Save the settings after adjusting the position
        const width = parseFloat(miniMapElement.style.width);
        const height = parseFloat(miniMapElement.style.height);
        const opacity = parseFloat(miniMapElement.style.opacity) || 1;
        saveMinimapSettings(newTop, newLeft, width, height, opacity);
    }

    waitForMinimap();
};

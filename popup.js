// Wait for the DOM to load
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('expand').addEventListener('click', expandTimesheet);
    document.getElementById('extract').addEventListener('click', extractTimesheet);
    document.getElementById('write').addEventListener('click', writeTimesheet);

    var displayDiv = document.getElementById('timesheetDisplay');
    displayDiv.contentEditable = true;

    // Load and display the timesheet if it exists
    chrome.storage.local.get('timesheet', (data) => {
        if (data.timesheet) {
            displayTimesheet(data.timesheet);
        }
    });

    // Save timesheet to storage when edited
    let saveTimeout;
    displayDiv.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const updatedTimesheet = displayDiv.innerHTML;
            // Optionally sanitize the HTML here
            chrome.storage.local.set({ timesheet: updatedTimesheet }, () => {
                alert('Timesheet updated in storage.');
            });
        }, 500); // Adjust the delay as needed
    });
});

function expandTimesheet() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: () => {
                const element = document.getElementById('__table2');
                if (element) {
                    element.style.height = '1000px';
                    console.log('Element height set to 1000px.');
                } else {
                    console.log('Element with ID "__table2" not found.');
                }
                // console.log(sap.b.controls.panes.list.Table);
                const sldElement = document.getElementById('__table2_sld');
                if (sldElement) {
                    // Create a mousedown event, to trigger creation of element __table2_sld#
                    const mouseUpEvent = new MouseEvent('mousedown', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    });
                    sldElement.dispatchEvent(mouseUpEvent);
                    console.log('Dispatched mouseup event on element with ID "__table2_sld".');
                } else {
                    console.log('Element with ID "__table2_sld" not found.');
                }

                const sldHashElement = document.getElementById('__table2_sld#');
                if (sldHashElement) {
                    const mouseUpEvent = new MouseEvent('mouseup', {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    });
                    sldHashElement.dispatchEvent(mouseUpEvent);
                    console.log('Dispatched mouseup event on element with ID "__table2_sld#".');
                } else {
                    console.log('Element with ID "__table2_sld#" not found.');
                }
            },
        });
    });
}


function extractTimesheet() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: () => {
                const table = document.getElementById('__table2');
                return table ? table.outerHTML : null;
            },
        }, (results) => {
            if (results && results[0] && results[0].result) {
                const timesheetHTML = results[0].result;
                // Store the extracted table in chrome.storage
                chrome.storage.local.set({ timesheet: timesheetHTML }, () => {
                    // Display the timesheet in the popup
                    displayTimesheet(timesheetHTML);
                    alert('Timesheet has been reloaded.');
                });
            } else {
                alert('No timesheet found on this page.');
            }
        });
    });
}

function writeTimesheet() {
    chrome.storage.local.get('timesheet', (data) => {
        if (data.timesheet) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    args: [data.timesheet],
                    func: (timesheetHTML) => {
                        const table = document.getElementById('__table2');
                        if (table) {
                            table.outerHTML = timesheetHTML;
                            alert('Timesheet has been written to the page.');
                        } else {
                            alert('No target table found on this page.');
                        }
                    },
                });
            });
        } else {
            alert('No timesheet data to write.');
        }
    });
}

function displayTimesheet(timesheetHTML) {
    const displayDiv = document.getElementById('timesheetDisplay');
    if (displayDiv) {
        displayDiv.innerHTML = timesheetHTML;
    }
}

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
            chrome.storage.local.set({ timesheet: updatedTimesheet });
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
        chrome.scripting.executeScript(
            {
                target: { tabId: tabs[0].id },
                func: () => {
                    const container = document.getElementById('__table2');
                    if (!container) {
                        return null;
                    }

                    // Find the table within the container
                    const originalTable = container.querySelector('table');
                    if (!originalTable) {
                        return null;
                    }

                    // Extract data from the original table
                    const data = [];
                    const rows = originalTable.rows;
                    for (let i = 0; i < rows.length; i++) {
                        const cells = rows[i].cells;
                        const rowData = [];
                        for (let j = 0; j < cells.length; j++) {
                            const cell = cells[j];

                            // Check for input elements within the cell
                            const inputElement = cell.querySelector('input');
                            if (inputElement) {
                                // Get the value from the input element
                                rowData.push(inputElement.value.trim());
                            } else {
                                // Get text content if no input element
                                rowData.push(cell.innerText.trim());
                            }
                        }
                        data.push(rowData);
                    }

                    return data;
                },
            },
            (results) => {
                if (results && results[0] && results[0].result) {
                    const timesheetData = results[0].result;
                    // Build a new table from the extracted data
                    const newTableHTML = buildNewTimesheetTable(timesheetData);

                    // Store the new table HTML in chrome.storage
                    chrome.storage.local.set({ timesheet: newTableHTML }, () => {
                        // Display the timesheet in the popup
                        displayTimesheet(newTableHTML);
                        alert('Timesheet has been reloaded.');
                    });
                } else {
                    alert('No timesheet found on this page.');
                }
            }
        );
    });
}

function buildNewTimesheetTable(data) {
    let tableHTML = '<table border="1">';
    for (let i = 0; i < data.length; i++) {
        tableHTML += '<tr>';
        for (let j = 0; j < data[i].length; j++) {
            tableHTML += `<td contenteditable="true">${data[i][j]}</td>`;
        }
        tableHTML += '</tr>';
    }
    tableHTML += '</table>';
    return tableHTML;
}

function writeTimesheet() {
    chrome.storage.local.get('timesheet', (data) => {
        if (data.timesheet) {
            // Parse the stored timesheet HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.timesheet, 'text/html');
            const newTable = doc.querySelector('table');

            // Extract data from newTable
            const dataArray = [];
            const rows = newTable ? newTable.rows : [];
            for (let i = 0; i < rows.length; i++) {
                const cells = rows[i].cells;
                const rowData = [];
                for (let j = 0; j < cells.length; j++) {
                    const inputElement = cells[j].querySelector('input');
                    if (inputElement) {
                        rowData.push(inputElement.value.trim());
                    } else {
                        rowData.push(cells[j].innerText.trim());
                    }
                }
                dataArray.push(rowData);
            }

            // Now, inject this data back into the original table on the page
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tabs[0].id },
                        args: [dataArray],
                        function: function(timesheetData) {
                            console.log('Received timesheetData:', timesheetData);
                            const container = document.getElementById('__table2');
                            // Find the table within the container
                            const originalTable = container.querySelector('table');
                            if (originalTable) {
                                const rows = originalTable.rows;
                                for (let i = 0; i < timesheetData.length && i < rows.length; i++) {
                                    const cells = rows[i].cells;
                                    for (let j = 0; j < timesheetData[i].length && j < cells.length; j++) {
                                        const cell = cells[j];
                                        const inputElement = cell.querySelector('input');
                                        if (inputElement) {
                                            // Set the value of the input element
                                            inputElement.value = timesheetData[i][j];
                                        } else {
                                            // Set the text content of the cell
                                            cell.innerText = timesheetData[i][j];
                                        }
                                    }
                                }
                                alert('Timesheet has been written to the page.');
                            } else {
                                alert('No target table found on this page.');
                            }
                        },
                    },
                    () => {
                        if (chrome.runtime.lastError) {
                            console.error('Error executing script:', chrome.runtime.lastError);
                        }
                    }
                );
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

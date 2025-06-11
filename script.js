document.addEventListener('DOMContentLoaded', () => {
    const entriesContainer = document.getElementById('entries-container');
    const addEntryBtn = document.getElementById('add-entry-btn');
    const printReceiptsBtn = document.getElementById('print-receipts-btn');
    const entryTemplate = document.getElementById('entry-template');
    const { jsPDF } = window.jspdf;

    let entriesData = [];
    const MAX_ENTRIES = 30;

    function getSpanishMonth(monthIndex) {
        const months = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        return months[monthIndex];
    }

    // Helper for abbreviated Spanish month names
    function getSpanishShortMonth(monthIndex) {
        const shortMonths = [
            "Ene", "Feb", "Mar", "Abr", "May", "Jun",
            "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
        ];
        return shortMonths[monthIndex];
    }

    function formatDateForDisplay(dateString) {
        if (!dateString) return ''; // Return empty string if no date
        const parts = dateString.split('-'); // YYYY-MM-DD
        if (parts.length !== 3) return ''; // Basic validation

        const year = parts[0];
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const day = parts[2];

        // Create a date object to validate day/month and to easily get parts
        const dateObj = new Date(year, month, day);

        const formattedDay = day.toString().padStart(2, '0'); // Ensure two digits for day
        const formattedShortMonth = getSpanishShortMonth(dateObj.getMonth());

        return `${formattedDay}-${formattedShortMonth}-${year}`;
    }

    function formatDate(dateString) {
        if (!dateString) return 'Fecha no especificada';
        // Ensure date is treated as local by splitting and creating new Date
    const parts = dateString.split('-'); // Expects YYYY-MM-DD
    const date = new Date(parts[0], parts[1] - 1, parts[2]); // Month is 0-indexed

    const day = date.getDate().toString().padStart(2, '0');
    const month = getSpanishMonth(date.getMonth());
    const year = date.getFullYear();

    return `${day} de ${month} de ${year}`;
    }

    function saveEntries() {
        localStorage.setItem('receiptEntries', JSON.stringify(entriesData));
    }

    function loadEntries() {
        const storedEntries = localStorage.getItem('receiptEntries');
        if (storedEntries) {
            entriesData = JSON.parse(storedEntries);
            entriesData.forEach(entryData => renderEntry(entryData));
        } else {
            // Add one blank entry if nothing is loaded, and it's desired.
            // addEntry(); // Or leave it empty for user to click "Add"
        }
        updateAddEntryButtonState();
    }

    function updateAddEntryButtonState() {
        if (entriesData.length >= MAX_ENTRIES) {
            addEntryBtn.disabled = true;
            addEntryBtn.textContent = 'Límite de entradas alcanzado';
        } else {
            addEntryBtn.disabled = false;
            addEntryBtn.textContent = 'Agregar Nueva Entrada';
        }
    }

    function renderEntry(data) {
        if (entriesData.length > MAX_ENTRIES && !data) { // Prevent adding if rendering a new blank one over limit
            updateAddEntryButtonState();
            return;
        }

        const entryId = data ? data.id : Date.now().toString();
        const newEntryDiv = entryTemplate.cloneNode(true);
        newEntryDiv.style.display = 'block';
        newEntryDiv.id = entryId;

        const deptoInput = newEntryDiv.querySelector('.entry-depto');
        const inquilinoInput = newEntryDiv.querySelector('.entry-inquilino');
        const montoInput = newEntryDiv.querySelector('.entry-monto');
        const periodoFromInput = newEntryDiv.querySelector('.entry-periodo-from');
        const periodoToInput = newEntryDiv.querySelector('.entry-periodo-to');
        const fromDisplaySpan = newEntryDiv.querySelector('.from-display-span');
        const toDisplaySpan = newEntryDiv.querySelector('.to-display-span');
        const removeBtn = newEntryDiv.querySelector('.remove-entry-btn');
        const prevMonthBtn = newEntryDiv.querySelector('.prev-month-btn');
        const nextMonthBtn = newEntryDiv.querySelector('.next-month-btn');

        if (data) {
            deptoInput.value = data.depto || '';
            inquilinoInput.value = data.inquilino || '';
            montoInput.value = data.monto || '';
            periodoFromInput.value = data.periodoFrom || '';
            periodoToInput.value = data.periodoTo || '';
            // Update display spans for loaded data
            if(data.periodoFrom) fromDisplaySpan.textContent = formatDateForDisplay(data.periodoFrom);
            if(data.periodoTo) toDisplaySpan.textContent = formatDateForDisplay(data.periodoTo);
        } else {
            // Set default dates for new entries if no data provided
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            periodoFromInput.valueAsDate = firstDayOfMonth;
            periodoToInput.valueAsDate = lastDayOfMonth;
            // Update display spans for default new entry dates
            fromDisplaySpan.textContent = formatDateForDisplay(periodoFromInput.value);
            toDisplaySpan.textContent = formatDateForDisplay(periodoToInput.value);
        }

        // Event Listeners
        removeBtn.addEventListener('click', () => {
            newEntryDiv.remove();
            entriesData = entriesData.filter(e => e.id !== entryId);
            saveEntries();
            updateAddEntryButtonState();
        });

        prevMonthBtn.addEventListener('click', () => shiftMonth(entryId, -1));
        nextMonthBtn.addEventListener('click', () => shiftMonth(entryId, 1));

        [deptoInput, inquilinoInput, montoInput, periodoFromInput, periodoToInput].forEach(input => {
            input.addEventListener('input', () => {
                const entryIndex = entriesData.findIndex(e => e.id === entryId);
                if (entryIndex > -1) {
                    entriesData[entryIndex][input.classList.contains('entry-depto') ? 'depto' :
                                        input.classList.contains('entry-inquilino') ? 'inquilino' :
                                        input.classList.contains('entry-monto') ? 'monto' :
                                        input.classList.contains('entry-periodo-from') ? 'periodoFrom' : 'periodoTo'] = input.value;
                    if (input.type === 'date') {
                        const displaySpan = input.classList.contains('entry-periodo-from') ?
                                            fromDisplaySpan : // Use already queried span
                                            toDisplaySpan;   // Use already queried span
                        if (displaySpan) {
                            displaySpan.textContent = formatDateForDisplay(input.value);
                        }
                        validatePeriod(entryId);
                    }
                    saveEntries();
                }
            });
        });

        entriesContainer.appendChild(newEntryDiv);
        if (!data) { // Only add to entriesData if it's a new entry not loaded from storage
             entriesData.push({
                id: entryId,
                depto: deptoInput.value,
                inquilino: inquilinoInput.value,
                monto: montoInput.value,
                periodoFrom: periodoFromInput.value,
                periodoTo: periodoToInput.value,
            });
            saveEntries();
        }
        validatePeriod(entryId); // Initial validation for loaded or new entries
        updateAddEntryButtonState();
    }


    function addEntry(data = null) {
        if (entriesData.length >= MAX_ENTRIES) {
            alert('Se ha alcanzado el límite máximo de 30 entradas.');
            updateAddEntryButtonState();
            return;
        }
        renderEntry(data);
    }


    function validatePeriod(entryId) {
        const entryIndex = entriesData.findIndex(e => e.id === entryId);
        if (entryIndex === -1) return;

        const entryData = entriesData[entryIndex];
        const entryDiv = document.getElementById(entryId);
        if (!entryDiv) return;

        const periodoFromInput = entryDiv.querySelector('.entry-periodo-from');
        const periodoToInput = entryDiv.querySelector('.entry-periodo-to');

        if (periodoFromInput.value && periodoToInput.value) {
            const fromDate = new Date(periodoFromInput.value + 'T00:00:00');
            let toDate = new Date(periodoToInput.value + 'T00:00:00');

            const diffTime = Math.abs(toDate - fromDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include start day

            if (diffDays > 31) {
                const newToDate = new Date(fromDate);
                newToDate.setDate(newToDate.getDate() + 30);
                periodoToInput.valueAsDate = newToDate; // Update DOM
                entryData.periodoTo = periodoToInput.value; // Update data
                saveEntries();
            } else if (toDate < fromDate) { // Ensure ToDate is not before FromDate
                 periodoToInput.valueAsDate = fromDate;
                 entryData.periodoTo = periodoToInput.value;
                 saveEntries();
            }
        }
    }

    function shiftMonth(entryId, monthOffset) {
        const entryIndex = entriesData.findIndex(e => e.id === entryId);
        if (entryIndex === -1) return;

        const entryData = entriesData[entryIndex];
        const entryDiv = document.getElementById(entryId);
        if (!entryDiv) return;

        const periodoFromInput = entryDiv.querySelector('.entry-periodo-from');
        const periodoToInput = entryDiv.querySelector('.entry-periodo-to');

    let currentFromDate;
    if (periodoFromInput.value) {
        // Ensure date is parsed as local by appending time and using Date constructor
        currentFromDate = new Date(periodoFromInput.value + 'T00:00:00');
    } else {
        // Fallback if date is not set (e.g., new entry before user interaction)
        currentFromDate = new Date();
        currentFromDate.setHours(0, 0, 0, 0); // Normalize to midnight
        currentFromDate.setDate(1); // Default to 1st of current month
    }

    const originalFromDay = currentFromDate.getDate();

    // Calculate new "Desde" date
    let newFromDate = new Date(currentFromDate.valueOf()); // Clone current date
    newFromDate.setDate(1); // Set to 1st to avoid month skipping issues when adding/subtracting months
    newFromDate.setMonth(newFromDate.getMonth() + monthOffset);

    // Get the number of days in the new target month for "Desde"
    const daysInNewFromMonth = new Date(newFromDate.getFullYear(), newFromDate.getMonth() + 1, 0).getDate();

    // Set the day for newFromDate, capped by the actual number of days in that month
    newFromDate.setDate(Math.min(originalFromDay, daysInNewFromMonth));

    // Calculate new "Hasta" date
    // Preliminary "Hasta": one day before the "Desde" date would be in the *following* month.
    let preliminaryHastaDate = new Date(newFromDate.valueOf()); // Clone newFromDate
    preliminaryHastaDate.setMonth(preliminaryHastaDate.getMonth() + 1); // Advance by one month
    preliminaryHastaDate.setDate(preliminaryHastaDate.getDate() - 1); // Go back one day

    // Enforce 31-day maximum period (inclusive of start and end day)
    let newToDate = new Date(preliminaryHastaDate.valueOf()); // Clone

    // Calculate difference in days (inclusive)
    // getTime() returns UTC milliseconds. Difference is fine.
    const timeDiffMs = newToDate.getTime() - newFromDate.getTime();
    // Rounding handles potential DST shifts if dates were not normalized to midnight, but should be safe here.
    const diffDaysInclusive = Math.round(timeDiffMs / (1000 * 60 * 60 * 24)) + 1;

    if (diffDaysInclusive > 31) {
        newToDate = new Date(newFromDate.valueOf()); // Clone newFromDate
        newToDate.setDate(newFromDate.getDate() + 30); // Add 30 days to get a 31-day period
    }

    // Final safety check: ensure newToDate is not before newFromDate
    if (newToDate < newFromDate) {
        newToDate = new Date(newFromDate.valueOf()); // Set to be same as newFromDate if it somehow ended up earlier
    }

    // Update DOM and data store using YYYY-MM-DD format
    periodoFromInput.value = newFromDate.toISOString().split('T')[0];
    periodoToInput.value = newToDate.toISOString().split('T')[0];

    // Update display spans after shiftMonth
    const fromDisplaySpan = entryDiv.querySelector('.from-display-span');
    const toDisplaySpan = entryDiv.querySelector('.to-display-span');
    if (fromDisplaySpan) fromDisplaySpan.textContent = formatDateForDisplay(periodoFromInput.value);
    if (toDisplaySpan) toDisplaySpan.textContent = formatDateForDisplay(periodoToInput.value);

    entryData.periodoFrom = periodoFromInput.value;
    entryData.periodoTo = periodoToInput.value;

    saveEntries();
    }

    function printReceipts() {
        const validEntries = entriesData.filter(e => e.inquilino && e.monto && e.periodoFrom && e.periodoTo);

        if (validEntries.length === 0) {
            alert('No hay entradas válidas para imprimir. Asegúrese de que Inquilino, Monto y Períodos estén completos.');
            return;
        }

        const doc = new jsPDF({ unit: 'mm', format: 'letter' });
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 10; // mm
        const receiptWidth = (pageWidth - (margin * 3)) / 2; // 2 columns, 3 margins (left, middle, right)
        const receiptHeight = (pageHeight - (margin * 4)) / 3; // 3 rows, 4 margins (top, between, between, bottom)
        let x = margin;
        let y = margin;
        let entriesOnPage = 0;

        validEntries.forEach((entry, index) => {
            if (entriesOnPage > 0 && entriesOnPage % 6 === 0) {
                doc.addPage();
                x = margin;
                y = margin;
                entriesOnPage = 0;
            }

            const currentX = x + ( (entriesOnPage % 2) * (receiptWidth + margin) );
            const currentY = y + ( Math.floor(entriesOnPage / 2) * (receiptHeight + margin) );

            // Draw border for receipt (optional)
            doc.rect(currentX, currentY, receiptWidth, receiptHeight);

            let textY = currentY + 10; // Start text a bit inside the receipt box
            const textX = currentX + 5;
            const textMaxWidth = receiptWidth - 10;

            doc.setFontSize(10);
            doc.text(`RECIBO DE DINERO`, currentX + receiptWidth / 2, textY, { align: 'center' });
            textY += 6; // Reduced space after title

            doc.setFontSize(8);
            doc.text(`Recibí de: ${entry.inquilino || 'N/A'}`, textX, textY, { maxWidth: textMaxWidth });
            textY += 6; // Reduced space after Inquilino
            // Removed Departamento field
            // textY += 7; // Also removed this increment
            doc.text(`La cantidad de: $${parseFloat(entry.monto || 0).toLocaleString('en-US')}`, textX, textY, { maxWidth: textMaxWidth });
            textY += 6; // Reduced space after Monto
            doc.text(`Del período:`, textX, textY);
            textY += 4; // Reduced space after "Del período:" label
            doc.text(`  Desde: ${formatDate(entry.periodoFrom)}`, textX + 2, textY, { maxWidth: textMaxWidth -2 });
            textY += 4; // Reduced space after Desde date
            doc.text(`  Hasta: ${formatDate(entry.periodoTo)}`, textX + 2, textY, { maxWidth: textMaxWidth -2});
            textY += 15; // Increased space before Firma line

            doc.text(`Firma: ____________________`, textX, textY, { maxWidth: textMaxWidth });

            entriesOnPage++;
        });

        doc.save('recibos_alquiler.pdf');
    }

    addEntryBtn.addEventListener('click', () => addEntry()); // Pass no data for new blank entry
    printReceiptsBtn.addEventListener('click', printReceipts);

    loadEntries(); // Load entries from localStorage on page load
    if (entriesData.length === 0) { // If no entries loaded, add one by default
        addEntry();
    }
});

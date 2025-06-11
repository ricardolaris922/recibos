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

    function formatDate(dateString) {
        if (!dateString) return 'Fecha no especificada';
        // Ensure date is treated as local by splitting and creating new Date
        const parts = dateString.split('-');
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return `${date.getDate()} de ${getSpanishMonth(date.getMonth())} de ${date.getFullYear()}`;
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
        const removeBtn = newEntryDiv.querySelector('.remove-entry-btn');
        const prevMonthBtn = newEntryDiv.querySelector('.prev-month-btn');
        const nextMonthBtn = newEntryDiv.querySelector('.next-month-btn');

        if (data) {
            deptoInput.value = data.depto || '';
            inquilinoInput.value = data.inquilino || '';
            montoInput.value = data.monto || '';
            periodoFromInput.value = data.periodoFrom || '';
            periodoToInput.value = data.periodoTo || '';
        } else {
            // Set default dates for new entries if no data provided
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            periodoFromInput.valueAsDate = firstDayOfMonth;
            periodoToInput.valueAsDate = lastDayOfMonth;
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
                        validatePeriod(entryId); // Also updates DOM for periodoTo if changed
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

        let fromDate = periodoFromInput.valueAsDate ? new Date(periodoFromInput.valueAsDate.valueOf()) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        let toDate = periodoToInput.valueAsDate ? new Date(periodoToInput.valueAsDate.valueOf()) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

        const originalFromDay = fromDate.getDate();
        // const originalToDay = toDate.getDate(); // originalToDay is not directly used with duration method

        // Calculate new From Date
        let newFromDate = new Date(fromDate.valueOf());
        newFromDate.setMonth(newFromDate.getMonth() + monthOffset);
        // Adjust day if month change resulted in a shorter month (e.g. Jan 31 to Feb 28)
        if (newFromDate.getDate() !== originalFromDay) {
            newFromDate.setDate(0); // Go to last day of previous month
        }
        newFromDate.setDate(Math.min(originalFromDay, new Date(newFromDate.getFullYear(), newFromDate.getMonth() + 1, 0).getDate()));

        // Calculate new To Date by trying to maintain the original period's duration
        const originalTimeDiff = toDate.getTime() - fromDate.getTime();
        let newToDate = new Date(newFromDate.getTime() + originalTimeDiff);

        // If the original was end of month, try to keep it end of month
        const fromDatePlusOneMonth = new Date(fromDate.getFullYear(), fromDate.getMonth() +1, 1);
        const isLastDayFrom = fromDate.toDateString() === (new Date(fromDatePlusOneMonth.getFullYear(), fromDatePlusOneMonth.getMonth(), 0)).toDateString();

        const toDatePlusOneMonth = new Date(toDate.getFullYear(), toDate.getMonth()+1, 1);
        const isLastDayTo = toDate.toDateString() === (new Date(toDatePlusOneMonth.getFullYear(), toDatePlusOneMonth.getMonth(),0)).toDateString();

        if(isLastDayFrom){
            newFromDate = new Date(newFromDate.getFullYear(), newFromDate.getMonth()+1, 0);
        }
         if(isLastDayTo){
            newToDate = new Date(newToDate.getFullYear(), newToDate.getMonth()+1, 0);
        }

        // Final check: ensure toDate is after fromDate
        if (newToDate < newFromDate) {
            newToDate = new Date(newFromDate.getFullYear(), newFromDate.getMonth(), newFromDate.getDate());
             // Attempt to maintain original duration if possible, otherwise just set to same day or default
            const dayDiff = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
            newToDate.setDate(newToDate.getDate() + dayDiff);
            if(newToDate < newFromDate) newToDate = new Date(newFromDate.valueOf()); // Fallback
        }


        periodoFromInput.valueAsDate = newFromDate;
        periodoToInput.valueAsDate = newToDate;

        entryData.periodoFrom = periodoFromInput.value;
        entryData.periodoTo = periodoToInput.value;

        validatePeriod(entryId); // This will also save
        // saveEntries(); // Not needed here as validatePeriod calls it
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
            doc.text(`RECIBO DE ALQUILER`, currentX + receiptWidth / 2, textY, { align: 'center' });
            textY += 7;

            doc.setFontSize(8);
            doc.text(`Recibí de: ${entry.inquilino || 'N/A'}`, textX, textY, { maxWidth: textMaxWidth });
            textY += 7;
            doc.text(`Departamento: ${entry.depto || 'N/A'}`, textX, textY, { maxWidth: textMaxWidth });
            textY += 7;
            doc.text(`La cantidad de: $${parseFloat(entry.monto || 0).toFixed(2)}`, textX, textY, { maxWidth: textMaxWidth });
            textY += 7;
            doc.text(`Del período:`, textX, textY);
            textY += 5;
            doc.text(`  Desde: ${formatDate(entry.periodoFrom)}`, textX + 2, textY, { maxWidth: textMaxWidth -2 });
            textY += 5;
            doc.text(`  Hasta: ${formatDate(entry.periodoTo)}`, textX + 2, textY, { maxWidth: textMaxWidth -2});
            textY += 10;

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

document.addEventListener('DOMContentLoaded', function () {
    // --- SELECTORS ---
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    const uploadButtons = document.querySelectorAll('.upload-excel-btn');
    const modal = document.getElementById('uploadModal');
    const cancelBtn = document.getElementById('cancelUpload');
    const confirmBtn = document.getElementById('confirmUpload');
    const fileInput = document.getElementById('excelFile');
    const tipeBiayaInput = document.getElementById('currentTipeBiaya');
    const uploadProgressContainer = document.getElementById('uploadProgress');
    const progressPercentSpan = document.getElementById('progressPercent');
    const progressBarDiv = document.querySelector('.progress-bar');

    // --- UTILITY FUNCTIONS ---
    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined || isNaN(parseFloat(amount))) return '-';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // --- TABLE GENERATORS ---
    const generateTableA = (data) => {
        return `<div class="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" class="px-4 py-3 text-center align-middle border-r border-gray-300" rowspan="2">No.</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Tempat Tujuan</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Satuan</th>
                    <th scope="col" class="px-6 py-3 text-center border-b border-gray-300" colspan="4">Uang Harian Per Golongan (Rp)</th>
                    <th scope="col" class="px-6 py-3 text-center align-middle border-l border-gray-300" rowspan="2">Diklat/Bimtek dan lain-lain</th>
                </tr>
                <tr>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">A</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">B</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">C</th>
                    <th scope="col" class="px-6 py-3 text-center">D</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((item, index) => `
                <tr class="bg-white border-b hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
                    <td class="px-4 py-4 text-center">${index + 1}</td>
                    <td class="px-6 py-4">${item.uraian || ''}</td>
                    <td class="px-6 py-4">${item.satuan || ''}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_a)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_b)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_c)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_d)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.biaya_kontribusi || 0)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
    };

    const generateTableB = (data) => {
        return `<div class="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" class="px-4 py-3 text-center align-middle border-r border-gray-300" rowspan="2">No.</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Tempat Tujuan</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Satuan</th>
                    <th scope="col" class="px-6 py-3 text-center border-b border-gray-300" colspan="4">Tarif Hotel Per Golongan (Rp)</th>
                </tr>
                <tr>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">A</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">B</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">C</th>
                    <th scope="col" class="px-6 py-3 text-center">D</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((item, index) => `
                <tr class="bg-white border-b hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
                    <td class="px-4 py-4 text-center">${index + 1}</td>
                    <td class="px-6 py-4">${item.uraian || ''}</td>
                    <td class="px-6 py-4">${item.satuan || ''}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_a)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_b)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_c)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_d)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
    };

    const generateTableC = (data) => {
        return `<div class="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" class="px-4 py-3 text-center align-middle border-r border-gray-300">No.</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300">Provinsi</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300">Satuan</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">Besaran (Rp)</th>
                    <th scope="col" class="px-6 py-3 text-center">Diklat/Bimtek dan lain-lain kegiatan yang mengeluarkan biaya kontribusi (Rp)</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((item, index) => `
                <tr class="bg-white border-b hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
                    <td class="px-4 py-4 text-center">${index + 1}</td>
                    <td class="px-6 py-4">${item.provinsi || ''}</td>
                    <td class="px-6 py-4">${item.satuan || ''}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.besaran)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.biaya_kontribusi)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
    };

    const generateTableD = (data) => {
        return `<div class="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" class="px-4 py-3 text-center align-middle border-r border-gray-300">No.</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300">Uraian</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300">Satuan</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">Besaran (Rp)</th>
                    <th scope="col" class="px-6 py-3 text-center">Dalam Kota Lebih dari 8 Jam (Rp)</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((item, index) => `
                <tr class="bg-white border-b hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
                    <td class="px-4 py-4 text-center">${index + 1}</td>
                    <td class="px-6 py-4">${item.uraian || ''}</td>
                    <td class="px-6 py-4">${item.satuan || ''}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.besaran)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.biaya_kontribusi)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
    };

    const generateTableE = (data) => {
        return `<div class="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" class="px-4 py-3 text-center align-middle border-r border-gray-300" rowspan="2">No.</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Provinsi</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Satuan</th>
                    <th scope="col" class="px-6 py-3 text-center border-b border-gray-300" colspan="4">Tarif Hotel Per Golongan (Rp)</th>
                </tr>
                <tr>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">A</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">B</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">C</th>
                    <th scope="col" class="px-6 py-3 text-center">D</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((item, index) => `
                <tr class="bg-white border-b hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
                    <td class="px-4 py-4 text-center">${index + 1}</td>
                    <td class="px-6 py-4">${item.provinsi || ''}</td>
                    <td class="px-6 py-4">${item.satuan || ''}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_a)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_b)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_c)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_d)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
    };

    const generateTableF = (data) => {
        return `<div class="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" class="px-4 py-3 text-center align-middle border-r border-gray-300" rowspan="2">No.</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Tempat Tujuan</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Satuan</th>
                    <th scope="col" class="px-6 py-3 text-center border-b border-gray-300" colspan="4">Tarif Per Golongan (Rp)</th>
                </tr>
                <tr>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">A</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">B</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">C</th>
                    <th scope="col" class="px-6 py-3 text-center">D</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((item, index) => `
                <tr class="bg-white border-b hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
                    <td class="px-4 py-4 text-center">${index + 1}</td>
                    <td class="px-6 py-4">${item.uraian || ''}</td>
                    <td class="px-6 py-4">${item.satuan || ''}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_a)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_b)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_c)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_d)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
    };

    const generateTableG = (data) => {
        return `<div class="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" class="px-4 py-3 text-center align-middle border-r border-gray-300" rowspan="2">No.</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Tempat Tujuan</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Satuan</th>
                    <th scope="col" class="px-6 py-3 text-center border-b border-gray-300" colspan="4">Tarif Per Golongan (Rp)</th>
                </tr>
                <tr>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">A</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">B</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">C</th>
                    <th scope="col" class="px-6 py-3 text-center">D</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((item, index) => `
                <tr class="bg-white border-b hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
                    <td class="px-4 py-4 text-center">${index + 1}</td>
                    <td class="px-6 py-4">${item.uraian || ''}</td>
                    <td class="px-6 py-4">${item.satuan || ''}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_a)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_b)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_c)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_d)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
    };

    const generateTableH = (data) => {
        return `<div class="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" class="px-4 py-3 text-center align-middle border-r border-gray-300" rowspan="2">No.</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Kota Tujuan</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Satuan</th>
                    <th scope="col" class="px-6 py-3 text-center border-b border-gray-300" colspan="4">Tarif Per Golongan (Rp)</th>
                </tr>
                <tr>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">A</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">B</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">C</th>
                    <th scope="col" class="px-6 py-3 text-center">D</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((item, index) => `
                <tr class="bg-white border-b hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
                    <td class="px-4 py-4 text-center">${index + 1}</td>
                    <td class="px-6 py-4">${item.uraian || ''}</td>
                    <td class="px-6 py-4">${item.satuan || ''}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_a)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_b)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_c)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_d)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
    };

    const generateTableI = (data) => {
        return `<div class="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" class="px-4 py-3 text-center align-middle border-r border-gray-300" rowspan="2">No.</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Kota Tujuan</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Satuan</th>
                    <th scope="col" class="px-6 py-3 text-center border-b border-gray-300" colspan="4">Tarif Per Golongan (Rp)</th>
                </tr>
                <tr>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">A</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">B</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">C</th>
                    <th scope="col" class="px-6 py-3 text-center">D</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((item, index) => `
                <tr class="bg-white border-b hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
                    <td class="px-4 py-4 text-center">${index + 1}</td>
                    <td class="px-6 py-4">${item.uraian || ''}</td>
                    <td class="px-6 py-4">${item.satuan || ''}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_a)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_b)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_c)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_d)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
    };

    const generateTableJ = (data) => {
        return `<div class="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" class="px-4 py-3 text-center align-middle border-r border-gray-300" rowspan="2">No.</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Kota Tujuan</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300" rowspan="2">Satuan</th>
                    <th scope="col" class="px-6 py-3 text-center border-b border-gray-300" colspan="4">Tarif Per Golongan (Rp)</th>
                </tr>
                <tr>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">A</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">B</th>
                    <th scope="col" class="px-6 py-3 text-center border-r border-gray-300">C</th>
                    <th scope="col" class="px-6 py-3 text-center">D</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((item, index) => `
                <tr class="bg-white border-b hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
                    <td class="px-4 py-4 text-center">${index + 1}</td>
                    <td class="px-6 py-4">${item.uraian || ''}</td>
                    <td class="px-6 py-4">${item.satuan || ''}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_a)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_b)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_c)}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.gol_d)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
    };

    const generateTableK = (data) => {
        return `<div class="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" class="px-4 py-3 text-center align-middle border-r border-gray-300">No.</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300">Provinsi Tujuan</th>
                    <th scope="col" class="px-6 py-3 align-middle border-r border-gray-300">Satuan</th>
                    <th scope="col" class="px-6 py-3 text-center">Besaran (Rp)</th>
                </tr>
            </thead>
            <tbody>
                ${data.map((item, index) => `
                <tr class="bg-white border-b hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
                    <td class="px-4 py-4 text-center">${index + 1}</td>
                    <td class="px-6 py-4">${item.provinsi || ''}</td>
                    <td class="px-6 py-4">${item.satuan || ''}</td>
                    <td class="px-6 py-4 text-right">${formatCurrency(item.besaran)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
    };

    // --- CORE FUNCTIONS ---
    const updateAccordionContent = (accordionItem, data, tipeBiaya) => {
        const contentDiv = accordionItem.querySelector('.accordion-content');
        if (!contentDiv) return;

        if (!data || data.length === 0) {
            contentDiv.innerHTML = '<p class="text-center text-gray-500 py-4">Belum ada data standar biaya.</p>';
            return;
        }

        let tableHTML = '';
        switch (tipeBiaya) {
            case 'A':
                tableHTML = generateTableA(data);
                break;
            case 'B':
                tableHTML = generateTableB(data);
                break;
            case 'C':
                tableHTML = generateTableC(data);
                break;
            case 'D':
                tableHTML = generateTableD(data);
                break;
            case 'E':
                tableHTML = generateTableE(data);
                break;
            case 'F':
                tableHTML = generateTableF(data);
                break;
            case 'G':
                tableHTML = generateTableG(data);
                break;
            case 'H':
                tableHTML = generateTableH(data);
                break;
            case 'I':
                tableHTML = generateTableI(data);
                break;
            case 'J':
                tableHTML = generateTableJ(data);
                break;
            case 'K':
                tableHTML = generateTableK(data);
                break;
            default:
                console.warn(`Generator tabel untuk tipe "${tipeBiaya}" tidak ditemukan. Menggunakan format default.`);
                tableHTML = generateTableA(data);
        }
        contentDiv.innerHTML = tableHTML;
    };

    const loadStandarBiayaData = async (tipeBiaya) => {
        const button = document.querySelector(`.upload-excel-btn[data-tipe="${tipeBiaya}"]`);
        if (!button) return;
        const accordionItem = button.closest('.accordion-item');
        if (!accordionItem) return;

        const contentDiv = accordionItem.querySelector('.accordion-content');
        contentDiv.innerHTML = '<p class="text-center text-gray-500 py-4">Memuat data...</p>';

        try {
            const response = await fetch(`/api/standar-biaya/${tipeBiaya}`);
            if (!response.ok) throw new Error(`Server merespon dengan status ${response.status}`);
            const data = await response.json();
            updateAccordionContent(accordionItem, data, tipeBiaya);
        } catch (error) {
            console.error(`Gagal memuat data untuk tipe ${tipeBiaya}:`, error);
            contentDiv.innerHTML = `<p class="text-center text-red-500 py-4">Gagal memuat data. ${error.message}</p>`;
        }
    };

    const uploadFile = (file) => {
        const formData = new FormData();
        formData.append('excelFile', file);
        formData.append('tipe_biaya', tipeBiayaInput.value);

        uploadProgressContainer.classList.remove('hidden');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/standar-biaya/upload', true);

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBarDiv.style.width = percentComplete + '%';
                progressPercentSpan.textContent = Math.round(percentComplete) + '%';
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                setTimeout(() => {
                    modal.style.display = 'none';
                    loadStandarBiayaData(tipeBiayaInput.value);
                }, 500); // Delay untuk menunjukkan 100%
            } else {
                try {
                    const response = JSON.parse(xhr.responseText);
                    alert(response.message || 'Terjadi kesalahan saat upload.');
                } catch (e) {
                    alert('Terjadi kesalahan tidak dikenal saat upload.');
                }
            }
        });

        xhr.addEventListener('error', () => {
            alert('Terjadi kesalahan jaringan.');
            modal.style.display = 'none';
        });

        xhr.send(formData);
    };

    // --- EVENT LISTENERS ---
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function () {
            this.nextElementSibling.classList.toggle('hidden');
            this.querySelector('.accordion-arrow')?.classList.toggle('rotate-180');
        });
    });

    uploadButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const tipeBiaya = this.getAttribute('data-tipe');
            tipeBiayaInput.value = tipeBiaya;
            fileInput.value = '';
            uploadProgressContainer.classList.add('hidden');
            progressBarDiv.style.width = '0%';
            progressPercentSpan.textContent = '0%';
            modal.style.display = 'flex';
        });
    });

    cancelBtn.addEventListener('click', () => modal.style.display = 'none');
    confirmBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) uploadFile(fileInput.files[0]);
    });

    // --- INITIALIZATION ---
    uploadButtons.forEach(button => {
        const tipe = button.getAttribute('data-tipe');
        if (tipe) loadStandarBiayaData(tipe);
    });
});
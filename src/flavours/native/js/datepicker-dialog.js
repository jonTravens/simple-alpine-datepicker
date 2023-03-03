
/*
 *   This content is licensed according to the W3C Software License at
 *   https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document
 *
 *   File:   DatePickerDialog.js
 *   URL:    https://www.w3.org/WAI/ARIA/apg/patterns/dialogmodal/
 */

'use strict';

var DatePickerDialog = function (cdp) {
    this.cdp = cdp;
    // The locale to be used to translate the UI. 
    // By default, locale is detected from browser, but data-locale attribute can force it to another locale
    this.locale = this.cdp.getAttribute('data-locale') || Intl.NumberFormat().resolvedOptions().locale;

    
    this.defaultUi = {
        pickaDateLabel : "Pick a date",
        buttonLabelChange : "Changer la date",
        messageCursorKeys : "You can navigate with the arrow keys",
        prevYearLabel : "Previous year",
        prevMonthLabel : "Previous month",
        nextYearLabel : "Next year",
        nextMonthLabel : "Next month",
        okButtonLabel : "Confirm",
        cancelButtonLabel : "Cancel"
    }
    this.ui = Object.assign(this.defaultUi, this.getTranslation());

    this.lastMessage = '',
    
    this.dayLabels = this.daysForLocale();
    this.dayLabelsAria = this.daysForLocale('short');
    this.monthLabels = this.monthsForLocale();


    this.textboxNode = cdp.querySelector('.form-control');
    this.buttonNode = cdp.querySelector('.datepicker-btn');
    this.dialogNode = cdp.querySelector('.datepicker-dialog');
    this.messageNode = this.dialogNode.querySelector('.datepicker-dialog-message');

    this.monthYearNode = this.dialogNode.querySelector('.datepicker-dialog-current');

    this.prevYearNode = this.dialogNode.querySelector('.datepicker-dialog-prev-year');
    this.prevMonthNode = this.dialogNode.querySelector('.datepicker-dialog-prev-month');
    this.nextMonthNode = this.dialogNode.querySelector('.datepicker-dialog-next-month');
    this.nextYearNode = this.dialogNode.querySelector('.datepicker-dialog-next-year');

    this.okButtonNode = this.dialogNode.querySelector('.datepicker-dialog-submit');
    this.cancelButtonNode = this.dialogNode.querySelector('.datepicker-dialog-cancel');

    this.theadNode = this.dialogNode.querySelector('.datepicker-dialog-table thead');
    this.tbodyNode = this.dialogNode.querySelector('.datepicker-dialog-table tbody');

    this.lastRowNode = null;

    this.days = [];

    this.focusDay = new Date();
    this.selectedDay = new Date(0, 0, 1);

    this.isMouseDownOnBackground = false;

    this.init();
};

DatePickerDialog.prototype.getTranslation = function() {
    let itemKey = 'datepicker_' + this.locale;
    let translation = JSON.parse(window.sessionStorage.getItem(itemKey));
    if (translation) { return translation }

    fetch('./js/lang/' + this.locale + '.json')
        .then((response) => response.json())
        .then(function(data) { 
            window.sessionStorage.setItem(itemKey, JSON.stringify(data))
            translation = data;
        })
        .catch((error) => {
            console.error('There has been a problem with your fetch operation:', error);
            translation = {};
        });
    return translation;
}

DatePickerDialog.prototype.daysForLocale = function(weekdayFormat = 'long') {
    const format = new Intl.DateTimeFormat(this.locale, { weekday: weekdayFormat }).format;
    return [...Array(7).keys()].map(function(day) {
        let currentDay = format(new Date(Date.UTC(2021, 5, day)));
        return currentDay.charAt(0).toUpperCase() + currentDay.slice(1).replace('.', '');
    });
}

DatePickerDialog.prototype.monthsForLocale = function(monthFormat = 'long') {
    const format = new Intl.DateTimeFormat(this.locale, { month: monthFormat }).format;
    return [...Array(12).keys()].map(function(month) {
        let currentMonth = format(new Date(Date.UTC(2021, month, 1)));
        return currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
    });
}

DatePickerDialog.prototype.init = function () {
    // Initializes eventListeners
    this.textboxNode.addEventListener('blur', this.setDateForButtonLabel.bind(this));

    this.buttonNode.addEventListener('keydown', this.handleButtonKeydown.bind(this));
    this.buttonNode.addEventListener('click', this.handleButtonClick.bind(this));

    this.okButtonNode.addEventListener('click', this.handleOkButton.bind(this));
    this.okButtonNode.addEventListener('keydown', this.handleOkButton.bind(this));

    this.cancelButtonNode.addEventListener('click', this.handleCancelButton.bind(this));
    this.cancelButtonNode.addEventListener('keydown', this.handleCancelButton.bind(this));

    this.prevMonthNode.addEventListener('click', this.handlePreviousMonthButton.bind(this));
    this.nextMonthNode.addEventListener('click', this.handleNextMonthButton.bind(this));
    this.prevYearNode.addEventListener('click', this.handlePreviousYearButton.bind(this));
    this.nextYearNode.addEventListener('click', this.handleNextYearButton.bind(this));

    this.prevMonthNode.addEventListener('keydown', this.handlePreviousMonthButton.bind(this));
    this.nextMonthNode.addEventListener('keydown', this.handleNextMonthButton.bind(this));
    this.prevYearNode.addEventListener('keydown', this.handlePreviousYearButton.bind(this));
    this.nextYearNode.addEventListener('keydown', this.handleNextYearButton.bind(this));

    document.body.addEventListener('mouseup', this.handleBackgroundMouseUp.bind(this), true);

    // We fill the UI text for selected language
    this.prevYearNode.querySelector('.sr-only').innerText = this.ui.prevYearLabel;
    this.prevMonthNode.querySelector('.sr-only').innerText = this.ui.prevMonthLabel;
    this.nextYearNode.querySelector('.sr-only').innerText = this.ui.nextYearLabel;
    this.nextMonthNode.querySelector('.sr-only').innerText = this.ui.nextMonthLabel;
    this.okButtonNode.innerText = this.ui.okButtonLabel;
    this.cancelButtonNode.innerText = this.ui.cancelButtonLabel;
    
    const pickDateNodes = this.cdp.querySelectorAll('.datepicker-dialog-pick-date-label');
    pickDateNodes.forEach((item) => {
        item.innerText = this.ui.pickaDateLabel;
    });
    this.buttonNode.setAttribute('title', this.ui.pickaDateLabel);

    // We create the weekdays header
    this.theadNode.innerHTML = '';
    this.dayLabels.forEach(function(textLabel, index) {
        let cell = document.createElement('th');
        cell.setAttribute('scope', 'col');

        let ariaLabel = document.createElement('span');
        ariaLabel.setAttribute('aria-hiden', true); 
        ariaLabel.innerText = this.dayLabelsAria[index];
        
        let label = document.createElement('span'); 
        label.classList.add('sr-only');
        label.innerText = textLabel;
        
        cell.appendChild(ariaLabel);
        cell.appendChild(label);
        this.theadNode.appendChild(cell);
    }, this);

    // We create the grid for the dates
    this.tbodyNode.innerHTML = '';
    for (var i = 0; i < 6; i++) {
        var row = this.tbodyNode.insertRow(i);
        this.lastRowNode = row;
        for (var j = 0; j < 7; j++) {
            var cell = document.createElement('td');

            cell.tabIndex = -1;
            cell.addEventListener('click', this.handleDayClick.bind(this));
            cell.addEventListener('keydown', this.handleDayKeyDown.bind(this));
            cell.addEventListener('focus', this.handleDayFocus.bind(this));

            cell.textContent = '-1';

            row.appendChild(cell);
            this.days.push(cell);
        }
    }
    
    this.updateGrid(); // We fill in the grid with the dates for the current month
    this.close(false);
    this.setDateForButtonLabel();
};

DatePickerDialog.prototype.isSameDay = function (day1, day2) {
    return (
        day1.getFullYear() == day2.getFullYear() &&
        day1.getMonth() == day2.getMonth() &&
        day1.getDate() == day2.getDate()
    );
};

DatePickerDialog.prototype.isNotSameMonth = function (day1, day2) {
    return (
        day1.getFullYear() != day2.getFullYear() ||
        day1.getMonth() != day2.getMonth()
    );
};

DatePickerDialog.prototype.updateGrid = function () {
    var flag;
    var fd = this.focusDay;

    this.monthYearNode.textContent = this.monthLabels[fd.getMonth()] + ' ' + fd.getFullYear();

    var firstDayOfMonth = new Date(fd.getFullYear(), fd.getMonth(), 1);
    
    var dayOfWeek = firstDayOfMonth.getDay();
    
    var offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    firstDayOfMonth.setDate(firstDayOfMonth.getDate() - offset);
    var d = new Date(firstDayOfMonth);

    for (var i = 0; i < this.days.length; i++) {
        flag = d.getMonth() != fd.getMonth();
        this.updateDate(this.days[i], flag, d, this.isSameDay(d, this.selectedDay));
        d.setDate(d.getDate() + 1);

        // Hide last row if all dates are disabled (e.g. in next month)
        if (i === 35) {
            if (flag) {
                this.lastRowNode.style.visibility = 'hidden';
            } else {
                this.lastRowNode.style.visibility = 'visible';
            }
        }
    }
};

DatePickerDialog.prototype.updateDate = function (
    domNode,
    disable,
    day,
    selected
) {
    var d = day.getDate().toString();
    if (day.getDate() <= 9) {
        d = '0' + d;
    }

    var m = day.getMonth() + 1;
    if (day.getMonth() < 9) {
        m = '0' + m;
    }

    domNode.tabIndex = -1;
    domNode.removeAttribute('aria-selected');
    domNode.setAttribute('data-date', day.getFullYear() + '-' + m + '-' + d);

    if (disable) {
        domNode.classList.add('disabled');
        domNode.textContent = day.getDate();
    } else {
        domNode.classList.remove('disabled');
        domNode.textContent = day.getDate();
        if (selected) {
            domNode.setAttribute('aria-selected', 'true');
            domNode.tabIndex = 0;
        }
    }
};

DatePickerDialog.prototype.moveFocusToDay = function (day) {
    var d = this.focusDay;

    this.focusDay = day;

    if (
        d.getMonth() != this.focusDay.getMonth() ||
        d.getFullYear() != this.focusDay.getFullYear()
    ) {
        this.updateGrid();
    }
    this.setFocusDay();
};

DatePickerDialog.prototype.setFocusDay = function (flag) {
    if (typeof flag !== 'boolean') {
        flag = true;
    }

    for (var i = 0; i < this.days.length; i++) {
        var dayNode = this.days[i];
        var day = this.getDayFromDataDateAttribute(dayNode);

        dayNode.tabIndex = -1;
        if (this.isSameDay(day, this.focusDay)) {
            dayNode.tabIndex = 0;
            if (flag) {
                dayNode.focus();
            }
        }
    }
};

DatePickerDialog.prototype.open = function () {
    this.dialogNode.classList.add('datepicker-dialog-open')

    this.getDateFromTextbox();
    this.updateGrid();
};

DatePickerDialog.prototype.isOpen = function () {
    return window.getComputedStyle(this.dialogNode).display !== 'none';
};

DatePickerDialog.prototype.close = function (flag) {
    if (typeof flag !== 'boolean') {
        // Default is to move focus to combobox
        flag = true;
    }

    this.setMessage('');
    this.dialogNode.classList.remove('datepicker-dialog-open');

    if (flag) {
        this.buttonNode.focus();
    }
};

DatePickerDialog.prototype.moveToNextYear = function () {
    this.focusDay.setFullYear(this.focusDay.getFullYear() + 1);
    this.updateGrid();
};

DatePickerDialog.prototype.moveToPreviousYear = function () {
    this.focusDay.setFullYear(this.focusDay.getFullYear() - 1);
    this.updateGrid();
};

DatePickerDialog.prototype.moveToNextMonth = function () {
    this.focusDay.setMonth(this.focusDay.getMonth() + 1);
    this.updateGrid();
};

DatePickerDialog.prototype.moveToPreviousMonth = function () {
    this.focusDay.setMonth(this.focusDay.getMonth() - 1);
    this.updateGrid();
};

DatePickerDialog.prototype.moveFocusToNextDay = function () {
    var d = new Date(this.focusDay);
    d.setDate(d.getDate() + 1);
    this.moveFocusToDay(d);
};

DatePickerDialog.prototype.moveFocusToNextWeek = function () {
    var d = new Date(this.focusDay);
    d.setDate(d.getDate() + 7);
    this.moveFocusToDay(d);
};

DatePickerDialog.prototype.moveFocusToPreviousDay = function () {
    var d = new Date(this.focusDay);
    d.setDate(d.getDate() - 1);
    this.moveFocusToDay(d);
};

DatePickerDialog.prototype.moveFocusToPreviousWeek = function () {
    var d = new Date(this.focusDay);
    d.setDate(d.getDate() - 7);
    this.moveFocusToDay(d);
};

DatePickerDialog.prototype.moveFocusToFirstDayOfWeek = function () {
    var d = new Date(this.focusDay);
    d.setDate(d.getDate() - d.getDay());
    this.moveFocusToDay(d);
};

DatePickerDialog.prototype.moveFocusToLastDayOfWeek = function () {
    var d = new Date(this.focusDay);
    d.setDate(d.getDate() + (6 - d.getDay()));
    this.moveFocusToDay(d);
};

// Day methods

DatePickerDialog.prototype.isDayDisabled = function (domNode) {
    return domNode.classList.contains('disabled');
};

DatePickerDialog.prototype.getDayFromDataDateAttribute = function (domNode) {
    var parts = domNode.getAttribute('data-date').split('-');
    return new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
};
// Textbox methods

DatePickerDialog.prototype.setTextboxDate = function (domNode) {
    var d = this.focusDay;

    if (domNode) {
        d = this.getDayFromDataDateAttribute(domNode);
        // updated aria-selected
        this.days.forEach((day) =>
            day === domNode
                ? day.setAttribute('aria-selected', 'true')
                : day.removeAttribute('aria-selected')
        );
    }

    var day = d.getDate() < 10 ? '0' + d.getDate() : d.getDate();
    var month = d.getMonth() + 1 < 10 ? '0' + (d.getMonth() + 1) : d.getMonth() + 1;
    var year = d.getFullYear();

    this.textboxNode.value =
        day + '/' + month + '/' + year;
    this.setDateForButtonLabel();
};

DatePickerDialog.prototype.getDateFromTextbox = function () {
    var parts = this.textboxNode.value.split('/');
    var day = parseInt(parts[0]);
    var month = parseInt(parts[1]);
    var year = parseInt(parts[2]);

    if (
        parts.length === 3 &&
        Number.isInteger(month) &&
        Number.isInteger(day) &&
        Number.isInteger(year)
    ) {
        if (year < 100) {
            year = 2000 + year;
        }
        this.focusDay = new Date(year, month - 1, day);
        this.selectedDay = new Date(this.focusDay);
    } else {
        // If not a valid date (MM/DD/YY) initialize with todays date
        this.focusDay = new Date();
        this.selectedDay = new Date(0, 0, 1);
    }
};

DatePickerDialog.prototype.setDateForButtonLabel = function () {
    var parts = this.textboxNode.value.split('/');

    if (
        parts.length === 3 &&
        Number.isInteger(parseInt(parts[0])) &&
        Number.isInteger(parseInt(parts[1])) &&
        Number.isInteger(parseInt(parts[2]))
    ) {
        var day = new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0])
        );

        var label = this.buttonLabelChange;
        label += ', ' + this.dayLabels[day.getDay()];
        label += ' ' + day.getDate();
        label += ' ' + this.monthLabels[day.getMonth()];
        label += ' ' + day.getFullYear();
        this.buttonNode.setAttribute('aria-label', label);
    } else {
        // If not a valid date, initialize with "Choose Date"
        this.buttonNode.setAttribute('aria-label', this.pickaDateLabel);
    }
};

DatePickerDialog.prototype.setMessage = function (str) {
    function setMessageDelayed() {
        this.messageNode.textContent = str;
    }

    if (str !== this.lastMessage) {
        setTimeout(setMessageDelayed.bind(this), 200);
        this.lastMessage = str;
    }
};

// Event handlers

DatePickerDialog.prototype.handleOkButton = function (event) {
    var flag = false;

    switch (event.type) {
        case 'keydown':
            switch (event.key) {
                case 'Tab':
                    if (!event.shiftKey) {
                        this.prevYearNode.focus();
                        flag = true;
                    }
                    break;

                case 'Esc':
                case 'Escape':
                    this.close();
                    flag = true;
                    break;

                default:
                    break;
            }
            break;

        case 'click':
            this.setTextboxDate();
            this.close();
            flag = true;
            break;

        default:
            break;
    }

    if (flag) {
        event.stopPropagation();
        event.preventDefault();
    }
};

DatePickerDialog.prototype.handleCancelButton = function (event) {
    var flag = false;

    switch (event.type) {
        case 'keydown':
            switch (event.key) {
                case 'Esc':
                case 'Escape':
                    this.close();
                    flag = true;
                    break;

                default:
                    break;
            }
            break;

        case 'click':
            this.close();
            flag = true;
            break;

        default:
            break;
    }

    if (flag) {
        event.stopPropagation();
        event.preventDefault();
    }
};

DatePickerDialog.prototype.handleNextYearButton = function (event) {
    var flag = false;

    switch (event.type) {
        case 'keydown':
            switch (event.key) {
                case 'Esc':
                case 'Escape':
                    this.close();
                    flag = true;
                    break;

                case 'Enter':
                    this.moveToNextYear();
                    this.setFocusDay(false);
                    flag = true;
                    break;
            }

            break;

        case 'click':
            this.moveToNextYear();
            this.setFocusDay(false);
            break;

        default:
            break;
    }

    if (flag) {
        event.stopPropagation();
        event.preventDefault();
    }
};

DatePickerDialog.prototype.handlePreviousYearButton = function (event) {
    var flag = false;

    switch (event.type) {
        case 'keydown':
            switch (event.key) {
                case 'Enter':
                    this.moveToPreviousYear();
                    this.setFocusDay(false);
                    flag = true;
                    break;

                case 'Tab':
                    if (event.shiftKey) {
                        this.okButtonNode.focus();
                        flag = true;
                    }
                    break;

                case 'Esc':
                case 'Escape':
                    this.close();
                    flag = true;
                    break;

                default:
                    break;
            }

            break;

        case 'click':
            this.moveToPreviousYear();
            this.setFocusDay(false);
            break;

        default:
            break;
    }

    if (flag) {
        event.stopPropagation();
        event.preventDefault();
    }
};

DatePickerDialog.prototype.handleNextMonthButton = function (event) {
    var flag = false;

    switch (event.type) {
        case 'keydown':
            switch (event.key) {
                case 'Esc':
                case 'Escape':
                    this.close();
                    flag = true;
                    break;

                case 'Enter':
                    this.moveToNextMonth();
                    this.setFocusDay(false);
                    flag = true;
                    break;
            }

            break;

        case 'click':
            this.moveToNextMonth();
            this.setFocusDay(false);
            break;

        default:
            break;
    }

    if (flag) {
        event.stopPropagation();
        event.preventDefault();
    }
};

DatePickerDialog.prototype.handlePreviousMonthButton = function (event) {
    var flag = false;

    switch (event.type) {
        case 'keydown':
            switch (event.key) {
                case 'Esc':
                case 'Escape':
                    this.close();
                    flag = true;
                    break;

                case 'Enter':
                    this.moveToPreviousMonth();
                    this.setFocusDay(false);
                    flag = true;
                    break;
            }

            break;

        case 'click':
            this.moveToPreviousMonth();
            this.setFocusDay(false);
            flag = true;
            break;

        default:
            break;
    }

    if (flag) {
        event.stopPropagation();
        event.preventDefault();
    }
};

DatePickerDialog.prototype.handleDayKeyDown = function (event) {
    var flag = false;

    switch (event.key) {
        case 'Esc':
        case 'Escape':
            this.close();
            break;

        case ' ':
            this.setTextboxDate(event.currentTarget);
            flag = true;
            break;

        case 'Enter':
            this.setTextboxDate(event.currentTarget);
            this.close();
            flag = true;
            break;

        case 'Tab':
            this.cancelButtonNode.focus();
            if (event.shiftKey) {
                this.nextYearNode.focus();
            }
            this.setMessage('');
            flag = true;
            break;

        case 'Right':
        case 'ArrowRight':
            this.moveFocusToNextDay();
            flag = true;
            break;

        case 'Left':
        case 'ArrowLeft':
            this.moveFocusToPreviousDay();
            flag = true;
            break;

        case 'Down':
        case 'ArrowDown':
            this.moveFocusToNextWeek();
            flag = true;
            break;

        case 'Up':
        case 'ArrowUp':
            this.moveFocusToPreviousWeek();
            flag = true;
            break;

        case 'PageUp':
            if (event.shiftKey) {
                this.moveToPreviousYear();
            } else {
                this.moveToPreviousMonth();
            }
            this.setFocusDay();
            flag = true;
            break;

        case 'PageDown':
            if (event.shiftKey) {
                this.moveToNextYear();
            } else {
                this.moveToNextMonth();
            }
            this.setFocusDay();
            flag = true;
            break;

        case 'Home':
            this.moveFocusToFirstDayOfWeek();
            flag = true;
            break;

        case 'End':
            this.moveFocusToLastDayOfWeek();
            flag = true;
            break;
    }

    if (flag) {
        event.stopPropagation();
        event.preventDefault();
    }
};

DatePickerDialog.prototype.handleDayClick = function (event) {
    if (!this.isDayDisabled(event.currentTarget) && event.which !== 3) {
        this.setTextboxDate(event.currentTarget);
        this.close();
    }

    event.stopPropagation();
    event.preventDefault();
};

DatePickerDialog.prototype.handleDayFocus = function () {
    this.setMessage(this.ui.messageCursorKeys);
};

DatePickerDialog.prototype.handleButtonKeydown = function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
        this.open();
        this.setFocusDay();

        event.stopPropagation();
        event.preventDefault();
    }
};

DatePickerDialog.prototype.handleButtonClick = function (event) {
    if (this.isOpen()) {
        this.close();
    } else {
        this.open();
        this.setFocusDay();
    }

    event.stopPropagation();
    event.preventDefault();
};

DatePickerDialog.prototype.handleBackgroundMouseUp = function (event) {
    if (
        !this.buttonNode.contains(event.target) &&
        !this.dialogNode.contains(event.target)
    ) {
        if (this.isOpen()) {
            this.close(false);
            event.stopPropagation();
            event.preventDefault();
        }
    }
};

// Initialize menu button date picker

window.addEventListener('load', function () {
    var datePickers = document.querySelectorAll('.datepicker');

    datePickers.forEach(function (dp) {
        new DatePickerDialog(dp);
    });
});

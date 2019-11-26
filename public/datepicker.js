$(function () {
    var dateFormat = "mm/dd/yy",
        from = $("#from")
            .datepicker({
                defaultDate: "",
                changeMonth: true,
                numberOfMonths: 1
            })
            .on("change", function () {
                to.datepicker("option", "minDate", getDate(this));
            }),
        to = $("#to").datepicker({
            defaultDate: "",
            changeMonth: true,
            numberOfMonths: 1
        })
            .on("change", function () {
                from.datepicker("option", "maxDate", getDate(this));
            }),
        from2 = $("#from2")
            .datepicker({
                defaultDate: "",
                changeMonth: true,
                numberOfMonths: 1
            })
            .on("change", function () {
                to2.datepicker("option", "minDate", getDate(this));
            }),
        to2 = $("#to2").datepicker({
            defaultDate: "",
            changeMonth: true,
            numberOfMonths: 1
        })
            .on("change", function () {
                from2.datepicker("option", "maxDate", getDate(this));
            });

    function getDate(element) {
        var date;
        try {
            date = $.datepicker.parseDate(dateFormat, element.value);
        } catch (error) {
            date = null;
        }

        return date;
    }
});
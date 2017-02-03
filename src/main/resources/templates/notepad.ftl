<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="/js/vendor/closure-library/closure/goog/base.js"></script>
    <script src="/js/notepad.js"></script>
</head>
<body>
<div id="notes">
</div>

<script>
    function main() {
        var noteData = [
            {'title': 'Note 1', 'content': 'Content of Note 1'},
            {'title': 'Note 2', 'content': 'Content of Note 2'}];

        var noteListElement = document.getElementById('notes');
        var notes = tutorial.notepad.makeNotes(noteData, noteListElement);
    }
    main();
</script>
</body>
</html>
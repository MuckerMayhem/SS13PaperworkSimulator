/* exported loadFile */
/* global run */
'use strict';

$(document).ready(function() {
    // Restore state on page load (hash takes precedence)
    (function restoreState() {
        var hash = location.hash && location.hash.length > 1 ? decodeURIComponent(location.hash.slice(1)) : null;
        var lastFile = localStorage.getItem('lastTemplateFile');               // e.g. "command/incident.txt"
        var lastInput = localStorage.getItem('lastInputContent');             // edited content
        var lastAssociated = localStorage.getItem('lastInputAssociatedFile'); // file the edited content was for

        function loadAndApply(filename, onMissing) {
            $.get('./templates/' + filename, function(data) {
                $('#input').val(data);
                // persist the fact we loaded this file and the content as baseline
                localStorage.setItem('lastTemplateFile', filename);
                localStorage.setItem('lastInputAssociatedFile', filename);
                localStorage.setItem('lastInputContent', data);
                run();
            }, 'text').fail(function() {
                if (typeof onMissing === 'function') onMissing();
            });
        }

        if (hash) {
            // Try to load file specified by the URL hash first
            loadAndApply(hash + '.txt', function() {
                // If hash file missing, fall back to saved edited content or last file
                if (lastAssociated && lastInput && lastAssociated === lastFile) {
                    $('#input').val(lastInput);
                    run();
                } else if (lastFile) {
                    loadAndApply(lastFile, function() {
                        if (lastInput) {
                            $('#input').val(lastInput);
                            run();
                        }
                    });
                } else if (lastInput) {
                    $('#input').val(lastInput);
                    run();
                }
            });
        } else if (lastAssociated && lastInput) {
            // User had been editing (possibly modified after loading a template) — restore edited content
            $('#input').val(lastInput);
            run();
        } else if (lastFile) {
            // No edited content saved, restore last opened file from disk
            loadAndApply(lastFile, function() {
                if (lastInput) {
                    $('#input').val(lastInput);
                    run();
                }
            });
        } else if (lastInput) {
            // Fallback: restore any raw saved content
            $('#input').val(lastInput);
            run();
        }
    })();

    $('#template').css('display', 'none');
    $('#load').click(function() {
        if ($('#template').css('display') === 'none') {
            $('#template').css('display', '');
        } else {
            closeTemplateMenu();
        }
    });
    $(document).keydown(function(e) {
        if (e.key === 'Escape') {
            closeTemplateMenu();
        }
    });
    $('#input').click(closeTemplateMenu);

    // persist live edits so they survive refreshes/close
    $('#input').on('input', function() {
        var val = $(this).val();
        localStorage.setItem('lastInputContent', val);
        // keep the association if present (so we know which file the edits are for)
        var assoc = localStorage.getItem('lastInputAssociatedFile');
        if (assoc) localStorage.setItem('lastInputAssociatedFile', assoc);
    });

    $.getJSON('./templates/index.json', null, function(data) {
        var html = constructHtml(data);
        $('#template').html(html);
        $('#template').menu({ autoOpen: false }); // should not be changed after initialization.
        $('.controlgroup').controlgroup('refresh');
    
        function constructHtml(data) {
            var str = '';
            for (var i = 0; i < Object.keys(data).length; ++i) {
                var key = Object.keys(data)[i];
                var value = Object.values(data)[i];
                str += '<li>';
                if (jQuery.type(value) === 'string') {
                    str += '<div onclick="loadFile(\'' + value + '\')">' + key + '</div>';

                } else if (jQuery.type(value) === 'object') {
                    str += '<div>' + key + '</div><ul>' + constructHtml(value) + '</ul>';

                } else {
                    console.warn('Unexpected value type in templates/index.json:', jQuery.type(value));
                }
                str += '</li>';
            }
            return str;
        }
    });
});

function loadFile(filename) {
    var newHash = filename.substr(0, filename.indexOf('.txt'));
    $(location).attr('hash', newHash);
    
    $.get('./templates/' + filename, function(data) {
        $('#input').val(data);
        run();

        // persist which file was last opened and the content at load time
        localStorage.setItem('lastTemplateFile', filename);
        localStorage.setItem('lastInputAssociatedFile', filename);
        localStorage.setItem('lastInputContent', data);
    }, 'text');

    closeTemplateMenu();
}

function closeTemplateMenu() {
    $('#template').css('display', 'none');
    $('#template').menu('collapseAll');
}

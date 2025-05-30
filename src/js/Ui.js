/**
 * UI
 * control buttons, modals, share input and title
 */
var Ui = ( function() {

    var settings = {
        selector: {
            title:  'h1',
            button: '.control-button',
            controls: {
                toggle: '.ui-toggle--controls',
            },
            share: {
                toggle: '.ui-toggle--share',
                input:  '.share-url-input',
                button: '.share-url-button',
                close:  '.ui-modal-close--share',
                link:   '.share-link'
            },
            info: {
                toggle: '.ui-toggle--info',
                close:  '.ui-modal-close--info'
            },
            modal: {
                wrapper: '[data-modal]',
                toggle:  '[data-modal-action="toggle"]'
            },
            recorder: {
                indicator: '.ui-indicator-recorder'
            },
            bpmInput: '#bpm-input',
            sampleUploadKick: '#sample-upload-kick',
            sampleUploadClap: '#sample-upload-clap',
            sampleUploadHiHat: '#sample-upload-hihat',
            sampleUploadSnare: '#sample-upload-snare',
            sampleUploadTom: '#sample-upload-tom',
            revertSamplesButton: '#revert-samples-button'
        },
        isVisible: {
            controls:   false,
            share:      false,
            info:       false,
            recorder:   false
        },
        shareServices: {
            facebook: {
                label:  'Facebook',
                url:    'https://facebook.com/sharer/sharer.php?u={url}'
            },
            twitter: {
                label:  'Twitter',
                url:    'http://www.twitter.com/share?url={url}'
            }
        }
    }

    var init = function() {
        // enable controls on touch devices
        if( Modernizr.touchevents ) {
            toggleControls();
        }

        if( location.href.indexOf( 'demo' ) > -1 && !settings.isVisible.controls ) {
            toggleControls();
        }

        // hide info in demo mode
        if( location.href.indexOf( 'demo' ) < 0 ) {
            toggleModal( 'info' );
        }

        bindEventHandlers();

        // Set initial BPM value
        if (Sequencer && typeof Sequencer.getBpm === 'function') {
            var initialBpm = Sequencer.getBpm();
            $(settings.selector.bpmInput).val(initialBpm);
            Debug.log('Ui.init() - Set initial BPM from Sequencer:', initialBpm);
        } else {
            // Fallback or default if Sequencer or getBpm is not available
            // This might happen if Ui.js is initialized before Sequencer.js fully sets up getBpm
            // Or if there's an issue with Sequencer's exposure of getBpm
            // For now, we can log this or set a default value like 108 from the input's HTML
            var initialBpmFromHtml = parseInt($(settings.selector.bpmInput).val());
            $(settings.selector.bpmInput).val(initialBpmFromHtml); // Ensure it's set if not by Sequencer
            Debug.log('Ui.init() - Sequencer.getBpm() not available or Sequencer not ready. Using HTML value for BPM:', initialBpmFromHtml);
        }
    }

    var bindEventHandlers = function() {
        $( document )
            // toggle controls
            // Changed from 'click' to 'touchstart' for better responsiveness on touch devices
            .on( 'touchstart', settings.selector.controls.toggle, function( event ) {
                event.preventDefault();

                toggleControls();
            } )
            // toggle modal
            .on( 'click', settings.selector.modal.toggle, function( event ) {
                event.preventDefault();

                var id = $( this ).closest( settings.selector.modal.wrapper ).attr( 'data-modal' );
                toggleModal( id );
            } )
            // control buttons
            .on( 'click', settings.selector.button, function( event ) {
                event.preventDefault();
            } )
            .on( 'mousedown', settings.selector.button, function( event ) {
                event.preventDefault();

                Debug.log( 'mousedown' );

                var button = $( this );

                // sample buttons
                if( button.attr( 'data-sample' ) ) {
                    var sample = parseInt( $( this ).attr( 'data-sample' ) );

                    $( document ).trigger( 'ui/clickButton', [{
                        sample: sample
                    }] );
                }

                // action buttons
                if( button.attr( 'data-action' ) ) {
                    var action = $( this ).attr( 'data-action' );

                    $( document ).trigger( 'ui/clickButton', [{
                        action: action
                    }] );
                }
            } )
            // share links
            .on( 'click', settings.selector.share.link, function( event ) {
                event.preventDefault();

                var service = $( this ).attr( 'data-service' );
                if( service ) {
                    openShareWindow( service, settings.url );
                }
            } )
            .on( 'sequencer/playSample', function( event, data ) {
                var sample = data.sample;
                highlightButton( sample );
                highlightTitle();
            } )
            .on( 'sequencer/saveSequence', function( event, data ) {
                setUrl( data.data );
            } )
            .on( 'sequencer/toggleMetronome', function( event, data ) {
                setButton( 'shift', data.state );
            } )
            .on( 'focus', settings.selector.share.input, function( event ) {
                $( this ).select();
            } )
            .on( 'recorder/start', function() {
                showRecorder( 'recording' );

                setButton( 'r', true );
            } )
            .on( 'recorder/stop', function() {
                showRecorder( 'processing' );

                setButton( 'r', false );
            } )
            .on( 'recorder/finish', function() {
                hideRecorder();
            } );

            new Clipboard( settings.selector.share.button );

        // BPM input change handler
        $( document ).on( 'change', settings.selector.bpmInput, function() {
            var newBpm = parseInt( $( this ).val() );
            if ( !isNaN( newBpm ) ) {
                Debug.log( 'Ui.handleChangeBpm()', newBpm );
                Sequencer.setBpm( newBpm );
            }
        });

        // Sample upload change handlers
        $( document ).on( 'change', settings.selector.sampleUploadKick, function(event) { handleSampleUpload(event, 0); });
        $( document ).on( 'change', settings.selector.sampleUploadClap, function(event) { handleSampleUpload(event, 1); });
        $( document ).on( 'change', settings.selector.sampleUploadHiHat, function(event) { handleSampleUpload(event, 2); });
        $( document ).on( 'change', settings.selector.sampleUploadSnare, function(event) { handleSampleUpload(event, 3); });
        $( document ).on( 'change', settings.selector.sampleUploadTom, function(event) { handleSampleUpload(event, 4); });

        // Revert samples button click handler
        $( document ).on( 'click', settings.selector.revertSamplesButton, function() {
            Debug.log( 'Ui.handleRevertSamplesClick()' );
            Sequencer.revertToDefaultSamples();
            // Optionally, provide UI feedback here, e.g., reset file input fields
            $(settings.selector.sampleUploadKick).val('');
            $(settings.selector.sampleUploadClap).val('');
            $(settings.selector.sampleUploadHiHat).val('');
            $(settings.selector.sampleUploadSnare).val('');
            $(settings.selector.sampleUploadTom).val('');
        });
    }

    var handleSampleUpload = function( event, sampleIndex ) {
        Debug.log( 'Ui.handleSampleUpload()', event, sampleIndex );
        var file = event.target.files[0];

        if (file) {
            var blobUrl = URL.createObjectURL(file);
            var sampleData = { src: blobUrl, gain: 0.9 }; // Default gain, can be configurable later

            // Construct the object in the format expected by Sequencer.loadCustomSamples
            // e.g., { 0: { src: 'blob_url_kick', gain: 0.9 } }
            var samplesToLoad = {};
            samplesToLoad[sampleIndex] = sampleData;

            Sequencer.loadCustomSamples(samplesToLoad);
            Sequencer.initSampler(); // Immediately rebuild and activate the sampler

            Debug.log('Ui.handleSampleUpload() - Loaded custom sample and re-initialized sampler:', sampleIndex, blobUrl);
            // Optionally, provide UI feedback here, e.g., display filename or success message
        } else {
            Debug.log('Ui.handleSampleUpload() - No file selected for sample index:', sampleIndex);
        }
    }

    var highlightButton = function( sample ) {
        Debug.log( 'Ui.highlightButton()', sample );

        var button = $( settings.selector.button ).filter( '[data-sample="' +  sample + '"]' );
        var color = $( 'html' ).css( 'backgroundColor' );

        new TimelineLite()
            .to(
                button,
                0.05,
                {
                    backgroundColor: '#fff'
                }
            )
            .to(
                button,
                0.05,
                {
                    backgroundColor: 'rgba( 255,255,255,0.01 )'
                }
            );
    }

    var highlightTitle = function() {
        Debug.log( 'Ui.highlightTitle()' );

        if( !Modernizr.touchevents && Viewport.getWidth() > 768 ) {
            var title = $( settings.selector.title );

            new TimelineLite()
                .to(
                    title,
                    0.01,
                    {
                        opacity: 1
                    }
                )
                .to(
                    title,
                    0.05,
                    {
                        opacity: 0.5
                    }
                );
        }
    }


    var toggleControls = function() {
        Debug.log( 'Ui.toggleControls()' );

        if( !settings.isVisible.controls ) {
            $( 'html' )
                .addClass( 'visible--ui-controls' );
        } else {
            $( 'html' )
                .removeClass( 'visible--ui-controls' );
        }

        settings.isVisible.controls = !settings.isVisible.controls;
    }


    var setButton = function( key, state ) {
        Debug.log( 'Ui.setButton()', key, state );

        var button = $( settings.selector.button ).filter( '[data-key="' + key + '"]' );

        if( button.length > 0 ) {
            if( state ) {
                button.addClass( 'active' );
            } else {
                button.removeClass( 'active' );
            }
        }
    }

    var toggleModal = function( id ) {
        Debug.log( 'Ui.toggleModal()', id );

        if( !settings.isVisible[id] ) {
            $( 'html' )
                .addClass( 'visible--ui-' + id );
        } else {
            $( 'html' )
                .removeClass( 'visible--ui-' + id );
        }

        settings.isVisible[id] = !settings.isVisible[id];
    }

    var setUrl = function( hash ) {
        Debug.log( 'Ui.setUrl()', hash );

        var url = location.protocol + '//' + location.hostname + location.pathname;
        settings.url = url + '#' + hash;

        $( settings.selector.share.input ).val( settings.url );
    }

    var openShareWindow = function( service, url ) {
        if( settings.shareServices[service] ) {
            var url = settings.shareServices[service].url.replace( '{url}', url );
            window.open( url, '108Share', 'width=520,height=320,menubar=no,location=yes,resizable=no,scrollbars=yes,status=no' );
        }
    }

    var buildRecorder = function() {
        Debug.log( 'Ui.buildRecorder()' );

        var indicator = $( '<span></span>' );

        indicator
            .addClass( settings.selector.recorder.indicator.replace( '.', '' ) )
            .appendTo( $( '.timeline-wrapper' ) );

        return indicator;
    }

    var showRecorder = function( status ) {
        Debug.log( 'Ui.showRecorder()', status );

        var indicator = $( settings.selector.recorder.indicator );

        if( indicator.length < 1 ) {
            indicator = buildRecorder();
        }

        indicator
            .removeClass( 'visible--recording' )
            .removeClass( 'visible--processing' )
            .addClass( 'visible' )
            .addClass( 'visible--' + status );
    }

    var hideRecorder = function() {
        Debug.log( 'Ui.hideRecorder()' );

        $( settings.selector.recorder.indicator )
            .removeClass( 'visible' )
            .removeClass( 'visible--recording' )
            .removeClass( 'visible--processing' );
    }

    return {
        init: function() { init(); }
    }

} )();

$( document ).ready( function() {
    Ui.init();
} );

'use strict';
require('es6-promise').polyfill();
require('isomorphic-fetch');

const express = require('express');
const bodyParser = require('body-parser');

const port = process.env.PORT || 5000;
const restService = express();
restService.use(bodyParser.json());

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

restService.post('/hook', function(req, res) {
    console.log('hook request');

    try {
        var speech = 'empty speech';
        var data = {};

        if (req.body) {
            var requestBody = req.body;

            if (requestBody.result) {
                var parameters = requestBody.result.parameters;

                var action = requestBody.result.action;
                if (
                    action &&
                        action === 'Search_for_videos' &&
                        parameters['VideoSubject']
                ) {
                    speech = '';
                    data = {};
                    const query = parameters['VideoSubject'];
                    fetch(
                        `https://bishopsvillage.com/api/v1/content/?all=1&search=${query}`
                    )
                        .then(req => req.json())
                        .then(json => {
                            if (json.count > 0) {
                                const randVideoIndex = randomIntFromInterval(
                                    0,
                                    json.count - 1
                                );
                                const video = json.results[randVideoIndex];
                                console.log(
                                    'Found:',
                                    json.count,
                                    randVideoIndex,
                                    video
                                );
                                speech = `We found ${json.count} videos about ${query}, including "${video.title}"`;

                                data = {
                                    facebook: {
                                        attachment: {
                                            type: 'template',
                                            payload: {
                                                template_type: 'generic',
                                                elements: [
                                                    {
                                                        title: video.title,
                                                        image_url: video.featured_image[
                                                            '720x480'
                                                        ],
                                                        subtitle: "We've got the right hat for everyone.",
                                                        default_action: {
                                                            type: 'web_url',
                                                            url: (
                                                                `https://bishopsvillage.com${video.absolute_url}`
                                                            ),
                                                            messenger_extensions: true,
                                                            webview_height_ratio: 'tall',
                                                            fallback_url: 'bishopsvillage.com'
                                                        },
                                                        buttons: [
                                                            {
                                                                type: 'web_url',
                                                                url: 'https://bishopsvillage.com',
                                                                title: 'View Website'
                                                            },
                                                            {
                                                                type: 'postback',
                                                                title: 'Signup & Watch Video',
                                                                payload: 'DEVELOPER_DEFINED_PAYLOAD'
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        }
                                    },
                                    slack: {
                                        text: speech,
                                        attachments: [
                                            {
                                                title: video.title,
                                                title_link: (
                                                    `https://bishopsvillage.com${video.absolute_url}`
                                                ),
                                                color: '#36a64f',
                                                fields: [
                                                    {
                                                        title: 'Description',
                                                        value: video.description,
                                                        short: 'false'
                                                    }
                                                ],
                                                thumb_url: video.featured_image[
                                                    '720x480'
                                                ]
                                            }
                                        ]
                                    }
                                };
                            } else {
                                speech = `I'm sorry, I didn't find any videos about ${query}`;
                            }
                            return res.json({
                                speech: speech,
                                displayText: speech,
                                source: 'apiai-tapp-webhook',
                                data: data
                            });
                        });
                } else {
                    speech = '';

                    if (requestBody.result.fulfillment) {
                        speech += requestBody.result.fulfillment.speech;
                        speech += ' ';
                    }

                    if (requestBody.result.action) {
                        speech += 'action: ' + requestBody.result.action + ' ';
                    }

                    var parameters = requestBody.result.parameters;
                    if (parameters) {
                        for (var p in parameters) {
                            if (parameters.hasOwnProperty(p)) {
                                speech += p + ': ' + parameters[p] + '; ';
                            }
                        }
                    }

                    return res.json({
                        speech: speech,
                        displayText: speech,
                        source: 'apiai-tapp-webhook'
                    });

                    console.log('result: ', speech);
                }
            }
        }
    } catch (err) {
        console.error("Can't process request", err);

        return res.status(400).json({
            status: {
                code: 400,
                errorType: err.message
            }
        });
    }
});

restService.listen(port, function() {
    console.info(`==> 🌎 Listening on port ${port}.`);
});

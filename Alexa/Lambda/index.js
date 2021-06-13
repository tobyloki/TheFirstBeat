//
// Copyright 2019 Amazon.com, Inc. or its affiliates.  All Rights Reserved.
// These materials are licensed under the Amazon Software License in connection with the Alexa Gadgets Program.
// The Agreement is available at https://aws.amazon.com/asl/.
// See the Agreement for the specific terms and conditions of the Agreement.
// Capitalized terms not defined in this file have the meanings given to them in the Agreement.
//
'use strict';

const Alexa = require('ask-sdk-core');
const Uuid = require('uuid/v4');

let skill;
exports.handler = function(event, context) {

    if (!skill) {
        skill = Alexa.SkillBuilders.custom()
            .addRequestHandlers(
                handler.LaunchRequestHandler,
                handler.YesIntentHandler,
                handler.NoIntentHandler,
                handler.CustomInterfaceEventHandler,
                handler.CustomInterfaceExpirationHandler,
                handler.StopAndCancelIntentHandler,
                handler.SessionEndedRequestHandler,
                handler.DefaultHandler
            )
            .addRequestInterceptors(handler.RequestInterceptor)
            .addResponseInterceptors(handler.ResponseInterceptor)
            .addErrorHandlers(handler.ErrorHandler)
            .withApiClient(new Alexa.DefaultApiClient())
            .create();
    }
    return skill.invoke(event, context);
};

const handler = {
    LaunchRequestHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            console.log("LaunchRequestHandler: checking if it can handle " + request.type);
            return request.type === 'LaunchRequest';
        },
        async handle(handlerInput) {
            console.log("== Launch Intent ==");
            console.log(JSON.stringify(handlerInput.requestEnvelope));

            let response;
            try {
                // Get connected gadget endpointId.
                console.log("Checking endpoint");
                response = await getConnectedEndpointsResponse(handlerInput);
                console.log("v1/endpoints response: " + JSON.stringify(response));

                if ((response.endpoints || []).length === 0) {
                    console.log('No connected gadget endpoints available');
                    response = handlerInput.responseBuilder
                        .speak("No gadgets found. Please try again after connecting your gadget.")
                        .getResponse();
                    return response;
                }

                let endpointId = response.endpoints[0].endpointId;

                // Store endpointId for using it to send custom directives later.
                console.log("Received endpoints. Storing Endpoint Id: " + endpointId);
                const attributesManager = handlerInput.attributesManager;
                let sessionAttributes = attributesManager.getSessionAttributes();
                sessionAttributes.endpointId = endpointId;
                attributesManager.setSessionAttributes(sessionAttributes);

                return handlerInput.responseBuilder
                    .speak("Welcome to The First Beat! You must tap the button to the beat of the L.E.D ring. In other words, tap the button when the green L.E.D. hits the blue section at the bottom of the ring. You have ten health points as shown on the L.E.D. strip. Each time you mess up, you lose one health. Survive as long as you can. Are you ready?")
                    .withShouldEndSession(false)
                    // Send the BlindLED directive to make the LED green for 20 seconds.
                    .addDirective(buildBlinkLEDDirective(endpointId, false))
                    .getResponse();
            }
            catch (err) {
                console.log("An error occurred while getting endpoints", err);
                response = handlerInput.responseBuilder
                    .speak("I wasn't able to get connected endpoints. Please try again.")
                    .withShouldEndSession(true)
                    .getResponse();
                return response;
            }
        }
    },
    YesIntentHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            let intentName = request.intent ? request.intent.name : '';
            console.log("YesIntentHandler: checking if it can handle " +
                request.type + " for " + intentName);
            return request.intent && request.intent.name === 'AMAZON.YesIntent';
        },
        handle(handlerInput) {
            // Retrieve the stored gadget endpointId from the SessionAttributes.
            const attributesManager = handlerInput.attributesManager;
            let sessionAttributes = attributesManager.getSessionAttributes();
            let endpointId = sessionAttributes.endpointId;

            // Create a token to be assigned to the EventHandler and store it
            // in session attributes for stopping the EventHandler later.
            sessionAttributes.token = Uuid();
            attributesManager.setSessionAttributes(sessionAttributes);

            console.log("YesIntent received. Starting game.");

            return handlerInput.responseBuilder
                // Send the BlindLEDDirective to trigger the cycling animation of the LED.
                .addDirective(buildBlinkLEDDirective(endpointId, true))
                // Start a EventHandler for 20 seconds to receive only one
                // 'Custom.ColorCyclerGadget.ReportColor' event and terminate.
                .addDirective(buildStartEventHandlerDirective(sessionAttributes.token, 20000,
                    'Custom.ColorCyclerGadget', 'ReportColor', 'SEND_AND_TERMINATE',
                    { 'data': "Congratulations! You survived long enough! Better than I expected." }))
                .getResponse();
        }
    },
    NoIntentHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            let intentName = request.intent ? request.intent.name : '';
            console.log("NoIntentHandler: checking if it can handle " +
                request.type + " for " + intentName);
            return request.intent && request.intent.name === 'AMAZON.NoIntent';
        },
        handle(handlerInput) {
            console.log("Received NoIntent..Exiting.");
            const attributesManager = handlerInput.attributesManager;
            let sessionAttributes = attributesManager.getSessionAttributes();

            // Send StopLED directive to stop LED animation and end skill session.
            return handlerInput.responseBuilder
                .addDirective(buildStopLEDDirective(sessionAttributes.endpointId))
                .speak("Alright. Good bye!")
                .withShouldEndSession(true)
                .getResponse();
        }
    },
    CustomInterfaceEventHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            console.log("CustomEventHandler: checking if it can handle " + request.type);
            return request.type === 'CustomInterfaceController.EventsReceived';
        },
        handle(handlerInput) {
            console.log("== Received Custom Event ==");

            let { request } = handlerInput.requestEnvelope;

            const attributesManager = handlerInput.attributesManager;
            let sessionAttributes = attributesManager.getSessionAttributes();

            // Validate eventHandler token
            if (sessionAttributes.token !== request.token) {
                console.log("EventHandler token doesn't match. Ignoring this event.");
                return handlerInput.responseBuilder
                    .speak("EventHandler token doesn't match. Ignoring this event.")
                    .getResponse();
            }

            let customEvent = request.events[0];
            let payload = customEvent.payload;
            let namespace = customEvent.header.namespace;
            let name = customEvent.header.name;

            let response = handlerInput.responseBuilder;

            if (namespace === 'Custom.ColorCyclerGadget' && name === 'ReportColor') {
                // On receipt of 'Custom.ColorCyclerGadget.ReportColor' event, speak the reported color
                // and end skill session.
                return response.speak('Aw. G.G. my friend. Better luck next time!')
                    .withShouldEndSession(true)
                    .getResponse();
            }
            return response;
        }
    },
    CustomInterfaceExpirationHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            console.log("CustomEventHandler: checking if it can handle " + request.type);
            return request.type === 'CustomInterfaceController.Expired';
        },
        handle(handlerInput) {
            console.log("== Custom Event Expiration Input ==");

            let { request } = handlerInput.requestEnvelope;

            const attributesManager = handlerInput.attributesManager;
            let sessionAttributes = attributesManager.getSessionAttributes();

            // When the EventHandler expires, send StopLED directive to stop LED animation
            // and end skill session.
            return handlerInput.responseBuilder
                .addDirective(buildStopLEDDirective(sessionAttributes.endpointId))
                .withShouldEndSession(true)
                .speak(request.expirationPayload.data)
                .getResponse();
        }
    },
    StopAndCancelIntentHandler: {
        canHandle(handlerInput) {
            const { request } = handlerInput.requestEnvelope;
            const intentName = request.intent ? request.intent.name : '';
            console.log("StopAndCancelIntentHandler: checking if it can handle " +
                request.type + " for " + intentName);
            return request.type === 'IntentRequest' &&
                (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent');
        },
        handle(handlerInput) {
            console.log("Received a Stop or a Cancel Intent..");

            let { attributesManager, responseBuilder } = handlerInput;
            let sessionAttributes = attributesManager.getSessionAttributes();

            // When the user stops the skill, stop the EventHandler,
            // send StopLED directive to stop LED animation and end skill session.
            if (sessionAttributes.token) {
                console.log("Active session detected, sending stop EventHandlerDirective.");
                responseBuilder.addDirective(buildStopEventHandlerDirective(sessionAttributes.token));
            }

            return responseBuilder.speak("Alright. see you later.")
                .addDirective(buildStopLEDDirective(sessionAttributes.endpointId))
                .withShouldEndSession(true)
                .getResponse();
        }
    },
    SessionEndedRequestHandler: {
        canHandle(handlerInput) {
            return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
        },
        handle(handlerInput) {
            console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
            return handlerInput.responseBuilder.getResponse();
        },
    },
    ErrorHandler: {
        canHandle(handlerInput, error) {
            let { request } = handlerInput.requestEnvelope;
            console.log("ErrorHandler: checking if it can handle " +
                request.type + ": [" + error.name + "] -> " + !!error.name);
            return !!error.name;
        },
        handle(handlerInput, error) {
            console.log("Global.ErrorHandler: error = " + error.message);

            return handlerInput.responseBuilder
                .speak("I'm sorry, something went wrong!")
                .getResponse();
        }
    },
    RequestInterceptor: {
        process(handlerInput) {
            let { attributesManager, requestEnvelope } = handlerInput;
            let sessionAttributes = attributesManager.getSessionAttributes();

            // Log the request for debugging purposes.
            console.log(`==Request==${JSON.stringify(requestEnvelope)}`);
            console.log(`==SessionAttributes==${JSON.stringify(sessionAttributes, null, 2)}`);
        }
    },
    ResponseInterceptor: {
        process(handlerInput) {

            let { attributesManager, responseBuilder } = handlerInput;
            let response = responseBuilder.getResponse();
            let sessionAttributes = attributesManager.getSessionAttributes();

            // Log the response for debugging purposes.
            console.log(`==Response==${JSON.stringify(response)}`);
            console.log(`==SessionAttributes==${JSON.stringify(sessionAttributes, null, 2)}`);
        }
    },
    DefaultHandler: {
        canHandle(handlerInput) {
            let { request } = handlerInput.requestEnvelope;
            let intentName = request.intent ? request.intent.name : '';
            console.log("DefaultHandler: checking if it can handle " +
                request.type + " for " + intentName);
            return true;
        },
        handle(handlerInput) {
            console.log("Unsupported Intent receive..Exiting.");
            return handlerInput.responseBuilder
                .speak("Unsupported Intent received. Exiting.")
                .getResponse();
        }
    }
};

function getConnectedEndpointsResponse(handlerInput) {
    return handlerInput.serviceClientFactory.getEndpointEnumerationServiceClient().getEndpoints();
}

function buildBlinkLEDDirective(endpointId, startGame) {
    return {
        type: 'CustomInterfaceController.SendDirective',
        header: {
            name: 'BlinkLED',
            namespace: 'Custom.ColorCyclerGadget'
        },
        endpoint: {
            endpointId: endpointId
        },
        payload: {
            startGame: startGame
        }
    };
}

function buildStopLEDDirective(endpointId) {
    return {
        type: 'CustomInterfaceController.SendDirective',
        header: {
            name: 'StopLED',
            namespace: 'Custom.ColorCyclerGadget'
        },
        endpoint: {
            endpointId: endpointId
        },
        payload: {}
    };
}

function buildStartEventHandlerDirective(token, durationMs, namespace, name, filterMatchAction, expirationPayload) {
    return {
        type: "CustomInterfaceController.StartEventHandler",
        token: token,
        eventFilter: {
            filterExpression: {
                'and': [
                    { '==': [{ 'var': 'header.namespace' }, namespace] },
                    { '==': [{ 'var': 'header.name' }, name] }
                ]
            },
            filterMatchAction: filterMatchAction
        },
        expiration: {
            durationInMilliseconds: durationMs,
            expirationPayload: expirationPayload
        }
    };
}

function buildStopEventHandlerDirective(token) {
    return {
        type: "CustomInterfaceController.StopEventHandler",
        token: token
    };
}
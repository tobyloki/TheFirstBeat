const Alexa = require('ask-sdk-core');
const ddbAdapter = require('ask-sdk-dynamodb-persistence-adapter'); // included in ask-sdk
const ddbTableName = 'AlexaTestSkill';
let AudioContext = require("web-audio-api").AudioContext;
let MusicTempo = require("music-tempo");
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
let Beats = 0;

// function sleep(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

function trim_beats(beats, offset) {
    for (let i = 1; i<beats.length; i++){
        if(beats[i] - beats[i-1] < offset){
            beats.splice(i, 1); 
        }
    }
    return beats;
}

function time_differince(beats){
    let diffs = [];
    for (let i = 1; i<beats.length; i++){
        diffs.push(beats[i] - beats[i-1]);
    }
    return diffs;
}


async function calcTempo(buffer){
    console.log("incaltempo");
    let audioData = [];
    console.log("computing with buffer now");
  // Take the average of the two channels
  if (buffer.numberOfChannels == 2) {
    let channel1Data = buffer.getChannelData(0);
    let channel2Data = buffer.getChannelData(1);
    let length = channel1Data.length;
    for (let i = 0; i < length; i++) {
      audioData[i] = (channel1Data[i] + channel2Data[i]) / 2;
    }
  } else {
    audioData = buffer.getChannelData(0);
  }
  console.log("making music tempo");
    // create music tempo object
    let mt = new MusicTempo(audioData);

    // trim beats by their intervals
    let new_beats = trim_beats(mt.beats, 0.9);
  
    // mimicking hits
    // for(let item of mt.beats){
    //     setTimeout(() => {
    //         console.log(`hit: ${Date.now()}`);
    //     }, item * 1000);
    // }
    
    // play song
    console.log("sending data out");
    /// sending data 
    Beats = time_differince(new_beats);
};

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        const attributes = await handlerInput.attributesManager.getPersistentAttributes() || {};
        handlerInput.attributesManager.setSessionAttributes(attributes);
        
        const speakOutput = 'Hello there, you need to speak now?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

async function getObject() {
    return new Promise((resolve, reject) => {
         let params = {
          Bucket: "code-day-songs", 
          Key: "newfile.mp3"
         };
         s3.getObject(params, function(err, data) {
           if (err){
               console.log(err, err.stack);
               resolve(err);
               }
           else{
               console.log(data);
               resolve(data);
           }
         });
    });
}

const HelloWorldIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'HelloWorldIntent';
    },
    async handle(handlerInput) {
        let filepath = 'https://code-day-songs.s3.us-west-2.amazonaws.com/newfile.mp3';
        // let data = fs.readFileSync(filepath);
        let data = await getObject();
        console.log(data.Body);
        let context = new AudioContext();
        
        // context.decodeAudioData(data.Body, calcTempo);
        console.log("entering promis");
        await new Promise((resolve, reject) => {
            console.log("in promis, entering decodeaud data");
            context.decodeAudioData(data.Body, async (buffer) => {
                console.log("made it here");
                await calcTempo(buffer);
                resolve();
            },
            async (error) => {
                console.log("there was an e")
                console.log(error);
            });
        });
        console.log(Beats);
        return handlerInput.responseBuilder
        .speak("<audio src='"+filepath+"'/>")
        .getResponse();
    }
};

const playGameIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'playGameIntent';
    },
    handle(handlerInput) {
        this.response.speak("<audio src='https://s3.amazonaws.com/ask-soundlibrary/animals/amzn_sfx_sheep_baa_01.mp3'/>");
        this.emit(':responseReady');
        const speakOutput = 'Play the Game!';
        
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const ColorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'ColorIntent';
    },
    handle(handlerInput) {
        const today = new Date();
        const month = today.toLocaleString('default', { month: 'long' });
        
        const color = handlerInput.requestEnvelope.request.intent.slots.color.value;
        const speakOutput = `The month is ${month}. Your favorite color is ${color}!`;
        
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        sessionAttributes.color = color;
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const IKnowYourColorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'IKnowYourColorIntent';
    },
    handle(handlerInput) {
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        const color = sessionAttributes.color;
        
        if(color != null){
            const speakOutput = `Your favorite color is ${color}`;
    
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .getResponse();
        } else {
            const speakOutput = `Please tell me your favorite color first.`;
    
            return handlerInput.responseBuilder
                .speak(speakOutput)
                .reprompt(speakOutput)
                .addElicitSlotDirective('color')
                .getResponse();
        }
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Sorry, I don\'t know about that. Please try again.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    async handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        
        // Any cleanup logic goes here.
        const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);
        await handlerInput.attributesManager.savePersistentAttributes();
        
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};

/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const LogRequestInterceptor = {
  process(handlerInput) {
    // Log Request
    console.log("==== REQUEST ======");
    console.log(JSON.stringify(handlerInput.requestEnvelope, null, 2));
  }
};
/**
 * Response Interceptor to log the response made to Alexa
 */
const LogResponseInterceptor = {
  process(handlerInput, response) {
    // Log Response
    console.log("==== RESPONSE ======");
    console.log(JSON.stringify(response, null, 2));
  }
};

function getPersistenceAdapter(tableName) {
  return new ddbAdapter.DynamoDbPersistenceAdapter({
    tableName: tableName,
    createTable: true,
  });
}

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .withPersistenceAdapter(getPersistenceAdapter(ddbTableName))
    .addRequestHandlers(
        LaunchRequestHandler,
        
        // START: your intents go here
        HelloWorldIntentHandler,
        playGameIntentHandler,
        // END
        
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .addRequestInterceptors(LogRequestInterceptor)
    .addResponseInterceptors(LogResponseInterceptor)
    .lambda();
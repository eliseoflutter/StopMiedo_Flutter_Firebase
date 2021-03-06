import { createTherapy, readUserId, updatePatient, writeMessage } from "./db_manager";
import * as admin from 'firebase-admin';

const { WebhookClient, Payload } = require('dialogflow-fulfillment');
const itineraries = require("../../../data/itinerary.json");
const situationsTaxonomy = require("../../../data/taxonomy_of_situations.json");

function clearOutgoingContexts(agent) {
    agent.contexts.forEach((context) => agent.context.set({ 'name': context.name, 'lifespan': 0 }));
}

export async function startIdentifySituations(agent, itinerary: number, neutral: string, anxiety: string, globalParameters) {
    const parameters = {};
    parameters['neutral'] = neutral;
    parameters['anxiety'] = anxiety;
    // Situaciones que el agente propondrá para ser incluidas
    parameters['available'] = setInitialSituations(itinerary, neutral, anxiety);
    // Listado de situaciones incluidas hasta el momento
    parameters['included'] = [];

    // Obtiene la primera situación que se propone al paciente
    const firstSituationData = getNextSituation(parameters['available']);
    parameters['currentLevel'] = firstSituationData.level;
    parameters['currentSituation'] = firstSituationData.situationCode;
    parameters['currentItem'] = firstSituationData.itemCode;
    parameters['currentItemStr'] = firstSituationData.itemStr;

    if (Object.keys(parameters['available']).length > 1) {
        await addResponse('Vamos a empezar hablando sobre situaciones relacionadas con ' + firstSituationData.levelStr.toLowerCase(), ++globalParameters.messagesCount, agent);
    }
    else {
        await addResponse('Nos vamos a centrar en situaciones relacionadas con ' + firstSituationData.levelStr.toLowerCase(), ++globalParameters.messagesCount, agent);
    }

    if (firstSituationData.level !== 'N1' && firstSituationData.level !== 'N2') {
        await addResponse('Concretamente, sobre' + firstSituationData.situationStr.toLowerCase(), ++globalParameters.messagesCount, agent);
    }

    await addResponse('¿Qué ansiedad te provoca "' + firstSituationData.itemStr + '"?', ++globalParameters.messagesCount, agent);

    // Añadir sugerencias para repuesta rápida a la respuesta del agente
    const suggestions = [];
    suggestions.push({ text: 'Indiferente / No me produce nada de ansiedad', value: 'indiferente' });
    suggestions.push({ text: 'Me produce algo de ansiedad', value: 'poca_ansiedad' });
    suggestions.push({ text: 'Me produce bastante ansiedad', value: 'bastante_ansiedad' });
    agent.add(
        new Payload(agent.UNSPECIFIED, { suggestions: suggestions }, { rawPayload: true, sendAsMessage: true })
    );

    // Clear outgoing contexts and set new context with required params
    clearOutgoingContexts(agent);
    const context = { 'name': `identificar_situaciones-listado`, 'lifespan': 50, 'parameters': parameters };
    agent.context.set(context);
    const global = { 'name': `global_context`, 'lifespan': 20, 'parameters': globalParameters };
    agent.context.set(global);
}

export async function loopIdentitifySituations(agent, globalParameters) {
    const contextParameters = agent.context.get('identificar_situaciones-listado').parameters;
    const newParameters = {};
    newParameters['included'] = contextParameters['included'];

    const answer = agent.query;
    if (answer !== 'indiferente') {
        // Añade la situación al listado de situaciones elegidas
        const situation = {
            itemCode: contextParameters['currentItem'],
            itemStr: contextParameters['currentItemStr'],
        }

        newParameters['included'].push(situation);

        // 16 situaciones: neutra, ansiogéna y 14 del listado
        if (newParameters['included'].length === 14) {
            await addResponse('¡Completado! Ya tenemos un listado de 16 situaciones temidas',  ++globalParameters.messagesCount, agent);
            await endIdentifySituations(agent, contextParameters['neutral'], contextParameters['anxiety'], newParameters['included']);
            return;
        }

        // Cada 3 situaciones elegidas, recuerda al usuario cuántas lleva
        else if (newParameters['included'].length % 3 === 0) {
            await addResponse(situationsAddedMsg(contextParameters['included'].length),  ++globalParameters.messagesCount, agent);
        }
    }

    // Obtiene la siguiente situación que se propone al paciente
    const nextSituationData = getNextSituation(contextParameters['available']);
    if (nextSituationData['itemCode']) {
        if (contextParameters['currentLevel'] !== nextSituationData.level || contextParameters['currentSituation'] !== nextSituationData.situationCode) {
            await addResponse('Hablemos ahora sobre situaciones relacionadas con ' + nextSituationData.situationStr.toLowerCase(),  ++globalParameters.messagesCount, agent);
        }

        newParameters['neutral'] = contextParameters['neutral'];
        newParameters['anxiety'] = contextParameters['anxiety'];
        newParameters['currentLevel'] = nextSituationData.level;
        newParameters['currentSituation'] = nextSituationData.situationCode;
        newParameters['currentItem'] = nextSituationData.itemCode;
        newParameters['currentItemStr'] = nextSituationData.itemStr;
        newParameters['available'] = nextSituationData.available;

        await addResponse('¿Te produce ansiedad "' + nextSituationData.itemStr + '"?',  ++globalParameters.messagesCount, agent);
        const suggestions = [];
        suggestions.push({ text: 'Indiferente', value: 'indiferente' });
        suggestions.push({ text: 'Me produce algo de ansiedad', value: 'poca_ansiedad' });
        suggestions.push({ text: 'Me produce bastante ansiedad', value: 'bastante_ansiedad' });
        agent.add(
            new Payload(agent.UNSPECIFIED, { suggestions: suggestions }, { rawPayload: true, sendAsMessage: true })
        );
        const context = { 'name': `identificar_situaciones-listado`, 'lifespan': 50, 'parameters': newParameters };
        agent.context.set(context);

        const global = { 'name': `global_context`, 'lifespan': 20, 'parameters': globalParameters };
        agent.context.set(global);
    }
    // Ya se han propuesto todas las situaciones para este itinerario
    else {
        const length = newParameters['included'].length;
        // 11 situaciones, ansiógena, neutra y 9 o más del listado
        if (length >= 9) {
            await addResponse('¡Terminado! Ya tenemos un listado de ' + (length + 2) + ' situaciones temidas',  ++globalParameters.messagesCount, agent);
            await endIdentifySituations(agent, contextParameters['neutral'], contextParameters['anxiety'], newParameters['included']);
        }
        else {
            await addResponse('He propuesto todas las situaciones todas las situaciones y sólo tenemos ' + length + ' elegidas',  ++globalParameters.messagesCount, agent);
            // TERMINAR CONVERSACIÓN
        }
    }
}

async function endIdentifySituations(agent, neutral: string, anxiety: string, situations) {
    const session: string = agent.session.split("/").pop();
    const userId: string = await readUserId(session);
    const neutralData = getSituationData(neutral);
    const anxietyData = getSituationData(anxiety);
    const neutralDoc = {
        itemCode: neutral,
        itemStr: neutralData.item,
    }


    const anxietyDoc = {
        itemCode: anxiety,
        itemStr: anxietyData.item,
    }

    await createTherapy(userId, { neutra: neutralDoc, anxiety: anxietyDoc, situations: situations });
    await updatePatient(userId, { identifySituationsSessionId: session, identifySituationsDate: admin.firestore.FieldValue.serverTimestamp() });

    clearOutgoingContexts(agent);

    // Close conversation
    agent.end("El siguiente paso es elaborar una jerarquía de ansiedad a partir de las situaciones que hemos identificado.");
    agent.end("Puedes hacerlo desde la pantalla 'Terapia'.");


}

function situationsAddedMsg(added: number): string {
    const possibleResponses = [
        '¡Muy bien! Ya hemos identificado ' + added + ' situaciones',
        '¡Perfecto! Ya tenemos ' + added + ' situaciones añadidas al listado',
        '¡Genial! Llevamos ' + added + ' situaciones identificadas'
    ];

    const pick = Math.floor(Math.random() * possibleResponses.length);

    return possibleResponses[pick];
}



function getNextSituation(availableSituations) {
    if (Object.keys(availableSituations).length === 0) {
        return {};
    }

    const levelCode = Object.keys(availableSituations)[0];
    const levelStr = situationsTaxonomy[levelCode]['category'];
    const situationCode = Object.keys(availableSituations[levelCode])[0];
    const situationStr = situationsTaxonomy[levelCode]['situations'][situationCode]['name'];
    const newAvailableSituations = availableSituations;
    let variantCode;
    let variantStr;
    let itemCode;
    let itemStr;

    if (levelCode === 'N1' || levelCode === 'N2') {
        itemCode = newAvailableSituations[levelCode][situationCode];
        itemStr = getSituationData(itemCode, levelCode)['item'];

        // Elimina la situación de disponibles
        delete newAvailableSituations[levelCode][situationCode];
    }
    else {
        variantCode = Object.keys(newAvailableSituations[levelCode][situationCode])[0];
        variantStr = situationsTaxonomy[levelCode]['situations'][situationCode]['variants'][variantCode]['name'];

        itemCode = newAvailableSituations[levelCode][situationCode][variantCode][0];
        itemStr = situationsTaxonomy[levelCode]['situations'][situationCode]['variants'][variantCode]['items'][itemCode]['name'];

        // Elimina la situación de disponibles
        newAvailableSituations[levelCode][situationCode][variantCode].shift();

        // Si no quedan más items, elimina esa variación
        if (Object.keys(newAvailableSituations[levelCode][situationCode][variantCode]).length === 0) {
            delete newAvailableSituations[levelCode][situationCode][variantCode];
        }

        // Si no quedan más variaciones, elimina esa situación
        if (Object.keys(newAvailableSituations[levelCode][situationCode]).length === 0) {
            delete newAvailableSituations[levelCode][situationCode];
        }
    }

    // Si no quedas más situaciones, elimina este nivel
    if (Object.keys(newAvailableSituations[levelCode]).length === 0) {
        delete newAvailableSituations[levelCode];
    }

    return {
        level: levelCode, levelStr: levelStr,
        situationCode: situationCode, situationStr: situationStr,
        variantCode: variantCode, variantStr: variantStr,
        itemCode: itemCode, itemStr: itemStr,
        available: newAvailableSituations
    }
}


// Para un itinerario dado, obtiene un listado de las situaciones
// que más ansiedad producen en la mayoría de los pacientes. 
// Con el listado de estas situaciones, construye el payload para que el 
// agente proponga estas situaciones al usuario.
export function getAnxietySuggestionsPayload(itinerary: number) {
    const situations = itineraries[itinerary]['greatest_anxiety'];
    const suggestions = [];

    situations.forEach((situation) => {
        const situationData = getSituationData(situation);
        suggestions.push({ value: situation, text: situationData['item'] });
    });

    return { suggestions: suggestions }
}

// Función utilizada cuándo comienza el bucle para identificar situaciones. 
// Dado el itinerario a seguir, y la situación que se ha definido cómo neutra, 
// devuelve un "itinerario reducido" en el que se han eliminado algunas situaciones.

function setInitialSituations(itinerary: number, neutralItem: string, anxietyItem: string) {
    const availableSituations = itineraries[itinerary]['situations'];
    const neutralData = getSituationData(neutralItem);

    // Si la situación neutra es la más alta del nivel 1, suponemos que las 
    // situaciones de N1 ('aproximación al vehículo están') superadas
    if (neutralData['level'] === 'N1') {
        if (neutralItem === 'C1-S2') {
            delete availableSituations['N1'];
        }
        else if (neutralItem === 'C1-S1') {
            delete availableSituations['N1']['S1'];
        }
    }
    // Si la situación neutra es del nivel N2, suponemos que las 
    // situaciones de N1 ('aproximación al vehículo están superadas')
    else if (neutralData['level'] === 'N2') {
        delete availableSituations['N1'];
        const situation = neutralItem.split("-")[1];
        delete availableSituations['N2'][situation];
    }
    // Si la situación neutra no es del nivel N2 ni N1, entonces suponemos
    // que las situaciones de N1 y N2 están superadas
    else {
        delete availableSituations['N1'];
        delete availableSituations['N2'];
        const neutralSituation = neutralItem.split("-")[1];
        const neutralVariant = neutralItem.split("-")[2].slice(0, -1);
        const index = availableSituations[neutralData['level']][neutralSituation][neutralVariant].indexOf(neutralItem);
        if (index > -1) {
            availableSituations[neutralData['level']][neutralSituation][neutralVariant].splice(index, 1);
        }
    }

    // Borra la situación que mayor ansiedad produce
    const anxietyData = getSituationData(anxietyItem);
    const anxietySituation = anxietyItem.split("-")[1];
    const anxietyVariant = anxietyItem.split("-")[2].slice(0, -1);
    const index = availableSituations[anxietyData['level']][anxietySituation][anxietyVariant].indexOf(anxietyItem);
    if (index > -1) {
        availableSituations[anxietyData['level']][anxietySituation][anxietyVariant].splice(index, 1);
    }


    return availableSituations;
}

export function getSituationData(itemCode: string, level?: string) {
    const situation: string = itemCode.split("-")[1];
    let levelStr: string;

    if (!level) {
        level = getSituationLevel(itemCode);
    }
    levelStr = situationsTaxonomy[level]['category'];
    const situationStr: string = situationsTaxonomy[level]['situations'][situation]['name'];

    let itemStr: string = '';
    let itemImg;
    let itemAudio;

    const situationTaxonomy = situationsTaxonomy[level]["situations"][situation];

    if (situationTaxonomy['variants']) {
        let variant: string = itemCode.split("-")[2];
        variant = variant.substring(0, variant.length - 1);
        const variantStr: string = situationTaxonomy['variants'][variant]['name'];
        itemStr = situationTaxonomy['variants'][variant]['items'][itemCode]['name'];
        itemImg = situationTaxonomy['variants'][variant]['items'][itemCode]['image'];
        itemAudio = situationTaxonomy['variants'][variant]['items'][itemCode]['audio'];
        return { level: level, levelStr: levelStr, situation: situation, situationStr: situationStr, variant: variant, variantStr: variantStr, item: itemStr, itemImg: itemImg, itemAudio: itemAudio };
    }
    else {
        itemStr = situationTaxonomy['items'][itemCode]['name'];
        itemImg = situationTaxonomy['items'][itemCode]['image'];
        itemAudio = situationTaxonomy['items'][itemCode]['audio'];
        return { level: level, levelStr: levelStr, situation: situation, situationStr: situationStr, item: itemStr, itemImg: itemImg, itemAudio: itemAudio };
    }
}


function getSituationLevel(itemCode: string): string {
    const category: string = itemCode.split("-")[0];
    if (["C1", "C2", "C3"].includes(category)) return "N" + category.substring(1);
    else if (category === "C4") {
        const variant: string = itemCode.split("-")[1];
        return (variant === "S1") ? "N4" : "N5";
    }
    else if (category === "C5") {
        const variant: string = itemCode.split("-")[1];
        return (variant === "S1") ? "N6" : "N7";
    }
}

async function addResponse(message: string, index: number, agent) {
    const session: string = agent.session.split("/").pop();
    agent.add(message);
    await writeMessage(true, message, session, index);
}


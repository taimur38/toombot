import * as axios from 'axios'
import * as FormData from 'form-data'
import { visualRecognitionAPIKey } from '../constants'

const session = axios.create({
    baseURL: 'https://gateway-a.watsonplatform.net/visual-recognition/api',
})

const version = '2016-05-20'

export async function classify(imageUrl : string) : Promise<classifiedImage> {

    try {
        const rsp = await session.get(`/v3/classify?api_key=${visualRecognitionAPIKey}&version=${version}&url=${imageUrl}`);
        //const rsp = await session.post(`/v3/classify?api_key=${visualRecognitionAPIKey}&version=${version}`, data);
        const payload = rsp.data as classifyResponse

        return payload.images[0];

    } catch(e) {

        console.error(e);
    }

    return null;
}

interface classifyResponse {
    custom_classes: number,
    images: classifiedImage[]
}

export interface classifiedImage {

    classifiers: classifier[],
    image: string
}

export interface classifier {
    classes: {
        class: string,
        score: number,
        type_hierarchy?: string
    }[]

}
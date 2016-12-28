import * as axios from 'axios'
import * as FormData from 'form-data'
import { visualRecognitionAPIKey } from '../constants'

const session = axios.create({
    baseURL: 'https://gateway-a.watsonplatform.net/visual-recognition/api',
})

const version = '2016-05-20'

export async function classify(imageUrl : string) : Promise<classifiedImage> {

    const data = new FormData();
    data.append('url', imageUrl);

    try {
        const rsp = await session.post(`/v3/classify?api_key=${visualRecognitionAPIKey}&version=${version}`, data);
        console.log(rsp.data);
        const payload = rsp.data as classifyResponse

        return payload[0];

    } catch(e) {

        console.error(e);
    }

    return null;
}

interface classifyResponse {
    images: classifiedImage[]
}

interface classifiedImage {

    classifiers: {
        classes: {
            class: string,
            score: number
        }[]
    }[],
    image: string
}
import * as path from 'path';

const rootDir = path.resolve(__dirname, '..');

const regex = new RegExp(rootDir, 'g');
const sanitizeSnapshot = (payload: any) => {
    return JSON.parse(JSON.stringify(payload).replace(regex, ''))
}

export default sanitizeSnapshot;

import * as path from 'path';

const rootDir = path.join(path.resolve(__dirname, '..'), '/');

const sanititzeSnapshot = (payload: any) => {
    const regex = new RegExp(rootDir, 'g');
    return JSON.parse(JSON.stringify(payload, null, 2).replace(regex, '/'))
}

export default sanititzeSnapshot;
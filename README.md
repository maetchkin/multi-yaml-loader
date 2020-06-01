# multi-yaml-loader
Webpack loader for YAML files with `!include` tag support. Based on [github.com/eemeli/yaml](https://github.com/eemeli/yaml)

## Usage
#### install
```
npm install multi-yaml-loader --save 
```

#### webpack.config.js
```
{
    ...

    module: {
    
        ...
    
        rules: [
            
            ...
            
            {
                test: /\.ya?ml$/,
                use: 'multi-yaml-loader'
            }
        ]
    }
}

```

#### file.yaml
```
title: Main file
sub: !include './relative/path/to/sub.yaml'
```


#### src.js

```
const yaml = require('./path/to/file.yaml');
```

### test
```
npm test
```

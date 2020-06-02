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
```yaml
title: Main file
sub: !include './relative/path/to/sub.yaml'
# cycle includes also possible, for example
# self: ./file.yaml
```

#### src.js

```javascript
/**
 * Result by default contains JSON with included documents as objects crosslinks (maybe cyclic =)
 */
const yaml = require('./path/to/file.yaml');
```

#### YamlIncludeError
Module defines `YamlIncludeError extends Error`

### test
```
npm test
```

## LICENSE
MIT

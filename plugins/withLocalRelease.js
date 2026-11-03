const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');
module.exports = function withLocalRelease(config) {
  config = withGradleProperties(config, config => {
    config.modResults = config.modResults.filter(item => !['org.gradle.jvmargs', 'org.gradle.parallel', 'reactNativeArchitectures'].includes(item.key));
    config.modResults.push({type:'property',key:'org.gradle.jvmargs',value:'-Xmx2560m -XX:MaxMetaspaceSize=768m'}, {type:'property',key:'org.gradle.parallel',value:'false'}, {type:'property',key:'reactNativeArchitectures',value:'arm64-v8a'});
    return config;
  });
  return withAppBuildGradle(config, config => {
    const signing = `
        folioRelease {
            storeFile file(System.getenv("FOLIO_KEYSTORE") ?: "../../.keys/folio-release.jks")
            storePassword System.getenv("FOLIO_STORE_PASSWORD") ?: ""
            keyAlias System.getenv("FOLIO_KEY_ALIAS") ?: "folio"
            keyPassword System.getenv("FOLIO_KEY_PASSWORD") ?: ""
        }
`;
    config.modResults.contents = config.modResults.contents.replace(/[ \t]*folioRelease\s*\{[^}]*\}\s*/g, '\n').replace('signingConfigs {', 'signingConfigs {' + signing).replace('signingConfig signingConfigs.debug\n            def enableShrinkResources', 'signingConfig signingConfigs.folioRelease\n            def enableShrinkResources');
    // Expo's release signing line may be followed by a comment or property in newer templates.
    config.modResults.contents = config.modResults.contents.replace(/(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/, '$1signingConfig signingConfigs.folioRelease');
    return config;
  });
};

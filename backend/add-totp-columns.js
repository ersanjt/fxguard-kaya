const sequelize = require('./models').sequelize;
async function run() {
    try {
        const [r] = await sequelize.query('PRAGMA table_info(Users)');
        const cols = (r || []).map(x => x.name);
        if (!cols.includes('totpSecret')) {
            await sequelize.query('ALTER TABLE Users ADD COLUMN totpSecret VARCHAR(255)');
            console.log('Added totpSecret');
        }
        if (!cols.includes('totpEnabled')) {
            await sequelize.query('ALTER TABLE Users ADD COLUMN totpEnabled BOOLEAN DEFAULT 0');
            console.log('Added totpEnabled');
        }
        console.log('Done');
    } catch (e) {
        console.error(e.message);
    }
    process.exit(0);
}
run();

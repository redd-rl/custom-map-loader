// const drivelist = require('drivelist');
// const Promise = require('bluebird');
// const find = Promise.promisifyAll(require('find'));
// const { findFile, downwardDirectories, filter, ofName, downwardDirectoriesSync} = require('find-files-by-patterns');
const fs = require('fs');
const path = require('path');
// const locatePath = require('locate-path');

const { ipcMain } = require('electron');
const stateManager = require('./stateManager');

// const findAllDrives = () => {
//  return drivelist.list()
//   .then((drives) => drives.map(({ mountpoints: [{ path }] }) => path))
// };

// const directoryFilter = (items) => items.filter((dirent) => {
//   if (dirent.name === 'System Volume Information') return false;
//   if (dirent.name === '$RECYCLE.BIN') return false;
//   if (dirent.name === '$Recycle.Bin') return false;
//   if (dirent.name === 'Recovery') return false;
//   if (dirent.name === 'Config.Msi') return false;
//   return dirent.isDirectory()
// });

// const filterAccessibleDirectories = (drivePaths) => {
//   return Promise.map(drivePaths, (path) => {
//     return fs.readdirAsync(path, { withFileTypes: true })
//       .then(directoryFilter)
//       .then(items => items.map(({ name }) => `${path}${name}`))
//   })
//   .then(paths => paths.flat());
// }

// const findPromise = (pattern, path) => {
//   return new Promise((resolve) => {
//     find.file(pattern, path, (result) => resolve(result))
//   });
// }

// const findRocketLeagueInstalls = (paths) => {
//   console.log(paths);
//   return Promise.mapSeries(paths, (path) => findPromise(/Labs_Utopia_P.upk/gm, path))
// };

const underpassPreservationName = 'ORIGINAL_UNDERPASS.upk';

const pathSuffix = '/TAGame/CookedPCConsole';
const makeFullPath = (directory) => `${directory}${pathSuffix}`;
const appBackupPath = path.join(AppData, underpassPreservationName);

const isValidUnderpass = (mapPath) => {
  const { size: fileSize } = fs.statSync(mapPath);
  if (fileSize >= 2575186 || fileSize <= 2104605) return false;
  return true;
};

const validPreservationMapExists = (gameMapsPath) => {
  const mapPath = path.join(gameMapsPath, underpassPreservationName);
  if (fs.existsSync(mapPath)) {
    return isValidUnderpass(mapPath);
  }
  if (fs.existsSync(appBackupPath)) {
    fs.copyFileSync(appBackupPath, path.join(gameMapsPath, underpassPreservationName));
    return isValidUnderpass(mapPath);
  }
  return false;
};

const validateOriginalUnderpass = (gameMapsPath) => {
  const mapPath = `${gameMapsPath}/Labs_Underpass_P.upk`;
  if (fs.existsSync(mapPath)) {
    return isValidUnderpass(mapPath);
  }
  return false;
};

const makePreservationMap = (gameMapsPath) => {
  const originalPath = `${gameMapsPath}/Labs_Underpass_P.upk`;
  const preservationPath = `${gameMapsPath}/${underpassPreservationName}`;
  fs.copyFileSync(originalPath, appBackupPath);
  return fs.copyFileSync(originalPath, preservationPath);
};

const copyMapOver = (mapId, gameMapsPath) => {
  const mapDirectory = stateManager.getFromState('customMapDirectory');
  const mapInfo = stateManager.getFromState('customMaps')[mapId];
  const customMapPath = `${mapDirectory}/${mapInfo.name}/${mapInfo.file}`;
  const newPath = `${gameMapsPath}/Labs_Underpass_P.upk`;
  fs.copyFileSync(customMapPath, newPath);
  return mapInfo.name;
};

const loadMapIntoRL = (_, mapId) => {
  const rocketLeagueDirectory = stateManager.getFromState('rocketLeagueDirectory');
  const rocketLeagueMapsPath = makeFullPath(rocketLeagueDirectory);
  if (validPreservationMapExists(rocketLeagueMapsPath)) {
    return copyMapOver(mapId, rocketLeagueMapsPath);
  }
  if (validateOriginalUnderpass(rocketLeagueMapsPath)) {
    makePreservationMap(rocketLeagueMapsPath);
    return copyMapOver(mapId, rocketLeagueMapsPath);
  }
  throw new Error('Could not find valid underpass map file!');
};

const repairMapFiles = () => {
  const rocketLeagueDirectory = stateManager.getFromState('rocketLeagueDirectory');
  const rocketLeagueMapsPath = makeFullPath(rocketLeagueDirectory);
  if (validateOriginalUnderpass(rocketLeagueMapsPath)) return null;
  if (!validateOriginalUnderpass(rocketLeagueMapsPath) && validPreservationMapExists(rocketLeagueMapsPath)) {
    return fs.renameSync(`${rocketLeagueMapsPath}/${underpassPreservationName}`, `${rocketLeagueMapsPath}/Labs_Underpass_P.upk`);
  }
  throw new Error('Could not find valid underpass map file.!');
};

ipcMain.handle('loadMap', loadMapIntoRL);
ipcMain.handle('repairGameFiles', repairMapFiles);

module.exports = {
  loadMapIntoRL,
  repairMapFiles,
};

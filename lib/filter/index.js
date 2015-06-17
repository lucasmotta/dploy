'use strict';

import map from './map';
import include from './include';
import exclude from './exclude';
import duplicated from './duplicated';


export default function(settings) {

  return map(settings).then(include).then(exclude).then(duplicated);

}

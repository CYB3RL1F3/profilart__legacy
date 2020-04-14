export const regexIndexOf = function (str, regex, startpos = 0) {
  var indexOf = str.substring(startpos).search(regex);
  return indexOf >= 0 ? indexOf + startpos : indexOf;
};


/**
 * Using the template engine render the values into the template
 * Note: copied from mintahazi2015
 */
module.exports = function (objectRepo, viewName){
    return function (req, res)
    {
    console.log("render: " + viewName);
    return res.render(viewName, objectRepo);
  };
  }
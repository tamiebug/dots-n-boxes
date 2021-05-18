import React, { useEffect, useState } from "react";
import { SwitchTransition, CSSTransition } from 'react-transition-group';


export function GameMenu(props) {
  const [ formData, setFormData ] = useState({...props.defaultFormSettings});

  const [ currentMenuPage, setCurrentMenuPage ] = useState();
  const [ previousMenuPages, setPreviousMenuPages ] = useState([]);
  const [ pageNames, setPageNames ] = useState([]);

  const context = { 
    linkTo: (destination, undo) => {
      if (undo) {
        const [lastPage, ...restOfPages] = previousMenuPages;
        setPreviousMenuPages(restOfPages);
        setCurrentMenuPage(lastPage);
      } else {
        setPreviousMenuPages([currentMenuPage, ...previousMenuPages]);
        setCurrentMenuPage(convertPageToIntegerAndValidate(destination, pageNames));
      }
    },
    menuName: props.name,
    formData: formData,
    setFormData: data => setFormData(data),
    currentPage: currentMenuPage,
  };

  useEffect(() => {
    const extractedPageNames = [...extractPageNames(props.items, context)];
    setPageNames([...extractedPageNames]);
    setCurrentMenuPage(convertPageToIntegerAndValidate(props.startingItemName, extractedPageNames ));
  }, []);


  return (currentMenuPage == undefined) ? null : (
    <div className="gameMenuModal">
      <SwitchTransition mode={"out-in"}>
        <CSSTransition
          key={ currentMenuPage }
          classNames='gameMenuItem'
          addEndListener={(node, done) => node.addEventListener("transitionend", done, false)}
        >
          { React.cloneElement(props.items(context)[currentMenuPage], { linkTo: context.linkTo, showPreviousButton: previousMenuPages.length !== 0}) }
        </CSSTransition>
      </SwitchTransition>
    </div>
  );
}

export function GameMenuItem(props) {
  return (
    <div className="gameMenuModalContent">
      <div className="gameMenuModalHeader">
        <h2> { props.pageName } </h2>
      </div>
      <div className="gameMenuModalBody">
        { props.children }
      </div>
      <div className="gameMenuModalFooter">
        {props.showPreviousButton && <button type="button" onClick={() => props.linkTo(undefined, true)}> Previous </button>}
      </div>
    </div>
  );
}

function convertPageToIntegerAndValidate(page, pageNames) {
  if (typeof page == 'number' && Number.isInteger(page) && page >= 0 && page < pageNames.length) { return page; }

  const pageIntegerFromNameLookup = pageNames.indexOf(page);
  if (pageIntegerFromNameLookup >= 0 && pageIntegerFromNameLookup < pageNames.length) { return pageIntegerFromNameLookup; }

  const pageIntegerFromNumericString = Number(page);
  if (!Number.isNaN(pageIntegerFromNumericString) && pageIntegerFromNumericString >= 0 && pageIntegerFromNumericString < pageNames.length) { return pageIntegerFromNumericString; }

  throw new Error(`convertActivePageToIntegerAndValidate got an invalid page: ${page}`);
}

function extractPageNames(itemsRenderProp, gameMenuContext) {
  const contextualizedItems = itemsRenderProp(gameMenuContext);
  console.log(contextualizedItems);
  if ( contextualizedItems.length ) {
    return contextualizedItems.map(item => item.props.pageName);
  } else { /* items is a singleton item */
    return [contextualizedItems.props.pageName];
  }
}
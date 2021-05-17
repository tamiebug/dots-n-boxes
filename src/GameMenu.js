import React, { useEffect, useState, useRef } from "react";
import Carousel from 'react-bootstrap/Carousel';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { SwitchTransition, CSSTransition } from 'react-transition-group';


export function GameMenu(props) {
  const [ formData, setFormData ] = useState({...props.defaultFormSettings});

  const [ currentMenuPage, setCurrentMenuPage ] = useState();
  const [ previousMenuPages, setPreviousMenuPages ] = useState([]);
  const [ pageNames, setPageNames ] = useState([]);
  const [ pages, setPages ] = useState([]);

  const pageNamesRef =  useRef({});
  pageNamesRef.current = pageNames;

  useEffect(() => {
    const context = { 
      linkTo: (destination, undo) => {
        if (undo) {
          const [lastPage, ...restOfPages] = previousMenuPages;
          setPreviousMenuPages(restOfPages);
          setCurrentMenuPage(lastPage);
        } else {
          setPreviousMenuPages([currentMenuPage, ...previousMenuPages]);
          setCurrentMenuPage(convertPageToIntegerAndValidate(destination, { pageNames: pageNamesRef.current }))
  ;
        }
      },
      menuName: props.name,
      formData,
      setFormData: (data) => setFormData(data),
      currentPage: currentMenuPage,
    };

    const { names, renderedItems } = extractPageNamesAndRender(props.items, context);
    setPageNames([...names]);
    setPages([...renderedItems]);
    setCurrentMenuPage(convertPageToIntegerAndValidate(props.startingItemName, { pageNames: names }));
  }, []);

  function convertPageToIntegerAndValidate(page, { pageNames }) {
    if (typeof page == 'number' && Number.isInteger(page) && page >= 0 && page < pageNames.length) { return page; }
  
    const pageIntegerFromNameLookup = pageNames.indexOf(page);
    if (pageIntegerFromNameLookup >= 0 && pageIntegerFromNameLookup < pageNames.length) { return pageIntegerFromNameLookup; }
  
    const pageIntegerFromNumericString = Number(page);
    if (!Number.isNaN(pageIntegerFromNumericString) && pageIntegerFromNumericString >= 0 && pageIntegerFromNumericString < pageNames.length) { return pageIntegerFromNumericString; }

    throw new Error(`convertActivePageToIntegerAndValidate got an invalid page: ${page}`);
  }

  return (pages.length < 1 || currentMenuPage == undefined) ? null : (
    <div className="gameMenuModal">
      <SwitchTransition mode={"out-in"}>
        <CSSTransition
          key={ currentMenuPage }
          classNames='fade'
          addEndListener={(node, done) => node.addEventListener("transitionend", done, false)}
        >
          { pages[currentMenuPage] }
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
        <Button variant="secondary" onClick={() => props.linkTo(undefined, true)}> Previous </Button>
      </div>
    </div>
  );
}



function extractPageNamesAndRender(itemsRenderProp, gameMenuContext) {
  const contextualizedItems = itemsRenderProp(gameMenuContext);
  if ( contextualizedItems.type === React.Fragment ) {
    const numberKids = React.Children.count(contextualizedItems.props.children);
    if ( numberKids > 1) {
      return { names: contextualizedItems.props.children.map(child => child.props.pageName), renderedItems: contextualizedItems.props.children };
    } else if ( numberKids == 1) {
      // For some reason, fragments with a single child returns not a singleton array, but just the element itself
      return { names: [contextualizedItems.props.children.props.pageName], renderedItems: [contextualizedItems.props.children] };
    } else {
      // Uuhh... what's goin on here
      throw new Error(`extractPageNames received no items -- did you include at least one GameMenuItem in GameMenu?`);
    }
  } else { /* items is a singleton item */
    return [contextualizedItems.props.pageName];
  }
}
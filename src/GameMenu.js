import React, { useState } from "react";
import Carousel from 'react-bootstrap/Carousel';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

export function GameMenu(props) {
  const [ formData, setFormData ] = useState({...props.defaultFormSettings});
  
  // We need to instantiate props.items with something to extract pageNames
  const pageNames = extractPageNames(props.items, { formData });
  const [ currentMenuPage, setCurrentMenuPage ] = useState(convertPageToIntegerAndValidate(props.startingItemName, pageNames));
  const [ previousMenuPages, setPreviousMenuPages ] = useState([]);

  const context = { 
    linkTo: (destination, undo) => {
      if (undo) {
        const [lastPage, ...restOfPages] = previousMenuPages;
        setPreviousMenuPages(restOfPages);
        setCurrentMenuPage(lastPage);
      } else {
        setPreviousMenuPages([currentMenuPage, ...previousMenuPages]); 
        setCurrentMenuPage(convertPageToIntegerAndValidate(destination, pageNames))
;
      }
    },
    menuName: props.name,
    formData,
    setFormData: (data) => setFormData(data),
    currentPage: currentMenuPage,
  };

  function carouselContents() {
    const kids = props.items(context).props.children;
    const itemsMapping = gameMenuItem => GameMenuItem({
      children: gameMenuItem.props.children, 
      pageName: gameMenuItem.props.pageName,
      linkTo: context.linkTo,
      showUndoButton: pageNames.length > 1,
    })
    if (React.Children.count(kids) == 1) return itemsMapping(kids)
    else return kids.map(itemsMapping);
  }

  // react-bootstrap Carousel does not function with non-Carousel.Item children, hence this workaround until a better one is found.
  return (
    <Modal show={ true }>
      <Carousel activeIndex={ currentMenuPage } controls={ false } indicators={ false } interval={ null } keyboard={ false }>
        { carouselContents() }
      </Carousel>
    </Modal>
  );
}

export function GameMenuItem(props) {
  return (
    <Carousel.Item>
      <Modal.Header>
        <Modal.Title> { props.pageName } </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        { props.children }
      </Modal.Body>
      {props.showUndoButton && (
        <Modal.Footer>
          <Button variant="secondary" onClick={() => props.linkTo(undefined, true)}> Previous </Button>
        </Modal.Footer>
      )}
    </Carousel.Item>
  );
}

function convertPageToIntegerAndValidate(page, pageNames) {
  if (typeof page == 'number' && Number.isInteger(page) && page >= 0 && page < pageNames.length) {
    return page;
  }

  const pageIntegerFromNameLookup = pageNames.indexOf(page);
  if (pageIntegerFromNameLookup >= 0 && pageIntegerFromNameLookup < pageNames.length) {
    return pageIntegerFromNameLookup;
  }

  const pageIntegerFromNumericString = Number(page);
  if (!Number.isNaN(pageIntegerFromNumericString) && pageIntegerFromNumericString >= 0 && pageIntegerFromNumericString < pageNames.length) {
    return pageIntegerFromNumericString;
  }

  throw new Error(`convertActivePageToIntegerAndValidate got an invalid page: ${page}`);
}

function extractPageNames(itemsRenderProp, gameMenuContext) {
  const contextualizedItems = itemsRenderProp(gameMenuContext);
  if ( contextualizedItems.type === React.Fragment ) {
    const numberKids = React.Children.count(contextualizedItems.props.children);
    if ( numberKids > 1) {
      return contextualizedItems.props.children.map(child => child.props.pageName);
    } else if ( numberKids == 1) {
      // For some reason, fragments with a single child returns not a singleton array, but just the element itself
      return [contextualizedItems.props.children.props.pageName];
    } else {
      // Uuhh... what's goin on here
      throw new Error(`extractPageNames received no items -- did you include at least one GameMenuItem in GameMenu?`);
    }
  } else { /* items is a singleton item */
    return [contextualizedItems.props.pageName];
  }
}
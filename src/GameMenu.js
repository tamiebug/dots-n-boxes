import React, { useState } from "react";
import Carousel from 'react-bootstrap/Carousel';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

export function GameMenu(props) {
  const [ formData, setFormData ] = useState({...props.defaultFormSettings});
  
  // We need to instantiate props.items with something to extract pageNames
  const pageNames = extractPageNames(props.items, { formData });
  const [ currentMenuPage, setCurrentMenuPage ] = useState(convertPageToIntegerAndValidate(props.startingItemName, pageNames));

  const context = { 
    linkTo: (destination) => setCurrentMenuPage(convertPageToIntegerAndValidate(destination, pageNames)),
    menuName: props.name,
    formData,
    setFormData: (data) => setFormData(data),
    currentPage: currentMenuPage,
  };

  // react-bootstrap Carousel does not function with non-Carousel.Item children, hence this workaround until a better one is found.
  return (
    <Modal show={ true }>
      <Carousel activeIndex={ currentMenuPage } controls={ false } indicators={ false } interval={ null } keyboard={ false }>
        { props.items(context).props.children.map(gameMenuItem => GameMenuItem({children: gameMenuItem.props.children, pageName: gameMenuItem.props.pageName})) }
      </Carousel>
    </Modal>
  );
}

export function GameMenuItem(props) {
  return (
    <Carousel.Item>
      <Modal.Header closeButton>
        <Modal.Title> { props.pageName } </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        { props.children }
      </Modal.Body>
      <Modal.Footer>
       <Button variant="secondary">Close</Button> 
      </Modal.Footer>
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
    return contextualizedItems.props.children.map(child => child.props.pageName);
  } else { /* items is a singleton item */
    return [contextualizedItems.props.pageName];
  }
}
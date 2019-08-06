import React, { Component, useState, useEffect, useRef } from 'react';
import { Fab, Button, Icon, Typography, Link } from '@material-ui/core';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import { renderjson } from '../../lib/renderjson/renderjson';
import { EnhancedJsonView } from '../EnhancedJsonView/EnhancedJsonView';
import moment from 'moment';
import { MAX_HISTORY } from '../../helpers/constants';
import './Exchange.scss';

export const Exchange = ({
  is_paused = false,
  togglePaused,
  level = 1,
  setLevel,
  position,
  setPosition,
  is_closed = false,
  toggleClosed,
  datum = {},
  data = [],
  closeFeed,
  server,
  exchange = '',
  routing_key = '',
  topic = '',
  type,
  evt_key
}) => {
  const getDepth = object => {
    let level = 1;
    for (const key in object) {
      // if (!object.hasOwnProperty(key)) continue;

      if (typeof object[key] == 'object') {
        let depth = getDepth(object[key]) + 1;
        level = Math.max(depth, level);
      }
    }
    return level;
  };

  const [ depth, setDepth ] = useState(_ => getDepth(datum));
  const json_ref = useRef();

  useEffect(
    _ => {
      setDepth(getDepth(datum));
    },
    [ datum.timestamp, evt_key ]
  );

  //   useEffect(
  //     _ => {
  //       if (!is_paused) {
  //         setDepth(getDepth(datum));
  //       }
  //     },
  //     [ is_paused ]
  //   );

  useEffect(
    _ => {
      const old_child = json_ref.current.firstElementChild;
      const new_child = renderjson.set_icons('chevron_right', 'expand_more').set_show_to_level(level)(datum.content);
      json_ref.current.replaceChild(new_child, old_child);
    },
    [ datum.timestamp, level ]
  );

  const upgradeLevel = () => {
    if (depth > level) setLevel(level + 1);
  };

  const downgradeLevel = () => {
    if (level > 0) setLevel(level - 1);
  };

  const nextPosition = () => (position < data.length ? setPosition(position + 1) : null);

  const prevPosition = () => (position > 0 ? setPosition(position - 1) : null);

  const isEmpty = obj => !Object.values(obj).length;

  const renderHeading = _ => {
    switch (type) {
      case 'rmq':
        return (
          <div className='exchange-title'>
            <Typography variant='h5' className='exchange-name'>
              <Link color='secondary' href={`http://${server}:15672/#/exchanges/%2F/${exchange}`} target='blank'>
                {exchange + (routing_key ? ' (' + routing_key + ')' : '')}
              </Link>
            </Typography>
            <Typography variant='subtitle1' className='server'>
              <Link color='secondary' href={`http://${server}:15672`} target='blank'>
                {server}
              </Link>
            </Typography>
          </div>
        );
      case 'zmq':
        return (
          <div className='exchange-title'>
            <Typography color='secondary' variant='h5' className='exchange-name'>
              {server}
            </Typography>
          </div>
        );
      case 'mqtt':
        return (
          <div className='exchange-title'>
            <Typography color='secondary' variant='h5' className='exchange-name'>
              {topic}
            </Typography>
            <Typography color='secondary' variant='subtitle1' className='server'>
              {server}
            </Typography>
          </div>
        );
    }
  };

  return (
    <div className={'exchange ' + type}>
      <div className='heading'>
        <Fab color='default' className='close-btn' size='small' onClick={_ => closeFeed(evt_key)}>
          <Icon>close</Icon>
        </Fab>
        <ToggleButtonGroup className='lvl-btn-group'>
          <Button className='btn' onClick={downgradeLevel}>
            <Icon>remove</Icon>
          </Button>
          <Button className='btn' onClick={upgradeLevel}>
            <Icon>add</Icon>
          </Button>
        </ToggleButtonGroup>
        <span className='typeName'>{type}</span>
        {renderHeading()}
      </div>
      <div className='window'>
        <div className={'json' + (is_closed ? ' closed' : '')}>
          <div className='basic-json-view' hidden={is_paused} ref={json_ref}>
            <div className='target-child' />
          </div>
          {is_paused && (
            <EnhancedJsonView
              src={datum.content}
              theme='summerfruit'
              collapsed={level}
              style={{
                background: 'transparent'
              }}
            />
          )}
        </div>
        <div className='footer'>
          <Button variant='contained' color='primary' className='btn' onClick={togglePaused}>
            <Icon>{is_paused ? 'play_arrow' : 'pause'}</Icon>
          </Button>
          <div className='last-received' onClick={toggleClosed}>
            {is_paused ? `Message ${position + 1} of ${MAX_HISTORY} Received:` : 'Last Message Received:'}
            <br />
            {isEmpty(datum) ? '' : moment(datum.timestamp).format(`hh:mm:ss${is_paused ? '.SSS' : ''} a, MMM DD`)}
          </div>
          <ToggleButtonGroup className='position-btn-group'>
            <Button className='btn' onClick={prevPosition} disabled={!is_paused || position === 0}>
              <Icon>arrow_left</Icon>
            </Button>
            <Button className='btn' onClick={nextPosition} disabled={!is_paused || position === data.length - 1}>
              <Icon>arrow_right</Icon>
            </Button>
          </ToggleButtonGroup>
        </div>
      </div>
    </div>
  );
};

import './App.css';
import { styled } from '@mui/material/styles';
import Input from '@mui/material/Input';
import Button from '@mui/material-next/Button';
import Button2 from '@mui/material/Button';
import CloudUploadTwoToneIcon from '@mui/icons-material/CloudUploadTwoTone';
import { Card, CardContent, Divider, Box, TextField, Chip } from '@mui/material';
import { useState } from 'react';
import RunModel from './main';

function App() {
  const [fileState, setFileState] = useState("Load input file .dzn")
  const [file, setFile] = useState(null)

  const StyledChip = styled(Chip)`font-size: 22px;`;

  const Root = styled('div')(({ theme }) => ({
    width: '100%',
    ...theme.typography.body2,
    '& > :not(style) + :not(style)': {
      marginTop: theme.spacing(2),
    },
  }));

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.dzn')) {
      setFileState(file.name)
      setFile(file)
    }else{
      setFileState("Error! upload a .dzn file")
    }
  };

  const onRunModel = () => {
    if(file){
      RunModel(file)
      console.log("success")
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <Card sx={{ minWidth: 700, minHeight: 540 }}>
          <CardContent>
            <Root>
              <Divider>
                <StyledChip label="INPUT" />
              </Divider>
              <Box sx={{ alignItems: 'center', justifyContent: 'center', paddingTop: 2}}>
                <label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".dzn"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <Button component="span" size="large" variant="elevated" color="tertiary">
                    <CloudUploadTwoToneIcon sx={{ fontSize: 80, color: 'black' }} />
                    <span style={{ color: 'black', marginLeft: 20, fontSize: 20 }}>
                      {fileState}
                    </span>
                  </Button>
                </label>
              </Box>
              <Button2 variant="contained" size="medium" color="success" sx={{background: '#282c34'}} onClick={onRunModel}>RUN MODEL</Button2>
              <Divider>
                <StyledChip label="OUTPUTS" />
              </Divider>
              <Box sx={{ alignItems: 'center', justifyContent: 'center' }}>
              </Box>
            </Root>
          </CardContent>
        </Card>
      </header>
    </div>
  );
}

export default App;

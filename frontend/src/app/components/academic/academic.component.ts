import { Component } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { AcademicYearsTabComponent } from './academic-years-tab/academic-years-tab.component';
import { ClassesTabComponent } from './classes-tab/classes-tab.component';
import { BatchesTabComponent } from './batches-tab/batches-tab.component';
import { SubjectsTabComponent } from './subjects-tab/subjects-tab.component';
import { BatchSubjectTeacherTabComponent } from './batch-subject-teacher-tab/batch-subject-teacher-tab.component';
import { StudentEnrollmentTabComponent } from './student-enrollment-tab/student-enrollment-tab.component';

@Component({
  selector: 'app-academic',
  standalone: true,
  imports: [
    TabsModule,
    AcademicYearsTabComponent,
    ClassesTabComponent,
    BatchesTabComponent,
    SubjectsTabComponent,
    BatchSubjectTeacherTabComponent,
    StudentEnrollmentTabComponent
  ],
  templateUrl: './academic.component.html',
  styleUrls: ['./academic.component.scss']
})
export class AcademicComponent {}

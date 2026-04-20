package com.example.blog.service.impl;

import com.example.blog.dao.PersonInfoRepository;
import com.example.blog.po.PersonInfo;
import com.example.blog.service.PersonInfoService;
import com.example.blog.util.MyBeanUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class PersonInfoServiceImpl implements PersonInfoService {

    private final PersonInfoRepository personInfoRepository;

    // 构造函数注入时校验依赖非空
    public PersonInfoServiceImpl(PersonInfoRepository personInfoRepository) {
        this.personInfoRepository = Objects.requireNonNull(personInfoRepository, "personInfoRepository must not be null");
    }

    @Override
    public List<PersonInfo> listPersonInfo() {
        try {
            return personInfoRepository.findAll();
        } catch (Exception e) {
            throw new RuntimeException("Failed to get person info list", e);
        }
    }

    @Override
    public void deletePersonInfo(Long id) {
        // 校验入参非空
        Objects.requireNonNull(id, "person info id must not be null");
        try {
            personInfoRepository.deleteById(id);
        } catch (Exception e) {
            throw new RuntimeException("Failed to delete person info with id: " + id, e);
        }
    }

    @Override
    public PersonInfo savePersonInfo(PersonInfo personInfo) {
        // 校验入参非空
        Objects.requireNonNull(personInfo, "personInfo must not be null");
        try {
            return personInfoRepository.save(personInfo);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save person info", e);
        }
    }

    @Override
    public PersonInfo updatePersonInfo(Long id, PersonInfo personInfo) {
        // 校验入参非空
        Objects.requireNonNull(id, "person info id must not be null");
        Objects.requireNonNull(personInfo, "personInfo must not be null");
        try {
            PersonInfo p = personInfoRepository.getReferenceById(id);
            // 校验查询结果非空
            Objects.requireNonNull(p, "person info with id: " + id + " not found");

            BeanUtils.copyProperties(personInfo, p, MyBeanUtils.getNullPropertyNames(personInfo));
            return personInfoRepository.save(p);
        } catch (Exception e) {
            throw new RuntimeException("Failed to update person info with id: " + id, e);
        }
    }
}